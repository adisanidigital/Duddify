-- =========================================================================
-- Recurring rules — add paid_by + atomic create-with-backfill
-- Paste this into Supabase SQL Editor and Run. Safe to re-run.
-- =========================================================================

-- 1. Add paid_by column for explicit attribution
alter table public.recurring_rules
  add column if not exists paid_by uuid references public.profiles(id) on delete set null;

create index if not exists recurring_paid_by_idx on public.recurring_rules(paid_by);

-- 2. Atomic create-with-backfill RPC
-- When a user creates a recurring rule, any occurrences whose date is
-- already today or in the past are immediately created as transactions,
-- and next_run_on is bumped to the next future occurrence.
create or replace function public.create_recurring_rule(
  p_category_id uuid,
  p_type        text,
  p_amount      numeric,
  p_frequency   text,
  p_next_run_on date,
  p_paid_by     uuid default null,
  p_note        text default null
)
returns table(rule_id uuid, backfilled int)
language plpgsql security definer set search_path = public as $$
declare
  v_user      uuid := auth.uid();
  v_household uuid;
  v_rule_id   uuid;
  v_run_date  date := p_next_run_on;
  v_count     int  := 0;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  select household_id into v_household from public.profiles where id = v_user;
  if v_household is null then raise exception 'no household'; end if;

  if p_frequency not in ('daily','weekly','monthly','yearly') then
    raise exception 'invalid frequency';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid amount'; end if;
  if p_next_run_on is null then raise exception 'date required'; end if;

  -- Insert the rule
  insert into public.recurring_rules (
    household_id, category_id, type, amount, note, frequency,
    day_of_month, next_run_on, active, created_by, paid_by
  ) values (
    v_household, p_category_id, p_type, p_amount, p_note, p_frequency,
    case when p_frequency = 'monthly' then extract(day from p_next_run_on)::int else null end,
    p_next_run_on, true, v_user, coalesce(p_paid_by, v_user)
  )
  returning id into v_rule_id;

  -- Backfill all occurrences whose date <= today
  while v_run_date <= current_date loop
    insert into public.transactions (
      household_id, user_id, category_id, type, amount, occurred_on,
      note, paid_by, recurring_id
    ) values (
      v_household, v_user, p_category_id, p_type, p_amount, v_run_date,
      coalesce(p_note, '(recurring)'),
      coalesce(p_paid_by, v_user),
      v_rule_id
    );
    v_count := v_count + 1;

    v_run_date := case p_frequency
      when 'daily'   then v_run_date + interval '1 day'
      when 'weekly'  then v_run_date + interval '1 week'
      when 'monthly' then v_run_date + interval '1 month'
      when 'yearly'  then v_run_date + interval '1 year'
    end;
  end loop;

  -- Persist the next future run date
  update public.recurring_rules set next_run_on = v_run_date where id = v_rule_id;

  return query select v_rule_id, v_count;
end $$;

-- 3. Update the daily cron processor to honour paid_by
create or replace function public.process_recurring_rules()
returns int language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_count int := 0;
  v_next  date;
begin
  for r in
    select * from public.recurring_rules
    where active = true and next_run_on <= current_date
  loop
    insert into public.transactions (
      household_id, user_id, category_id, type, amount, occurred_on, note, paid_by, recurring_id
    )
    values (
      r.household_id,
      coalesce(r.created_by, (select id from public.profiles where household_id = r.household_id limit 1)),
      r.category_id,
      r.type,
      r.amount,
      r.next_run_on,
      coalesce(r.note, '(recurring)'),
      coalesce(r.paid_by, r.created_by),
      r.id
    );

    v_next := case r.frequency
      when 'daily'   then r.next_run_on + interval '1 day'
      when 'weekly'  then r.next_run_on + interval '1 week'
      when 'monthly' then r.next_run_on + interval '1 month'
      when 'yearly'  then r.next_run_on + interval '1 year'
    end;

    update public.recurring_rules set next_run_on = v_next where id = r.id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end $$;
