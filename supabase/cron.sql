-- Optional: enable pg_cron for daily processing of recurring rules.
-- Run this AFTER schema.sql in Supabase SQL editor.
-- Free tier supports pg_cron.

create extension if not exists pg_cron;

create or replace function public.process_recurring_rules()
returns int language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_count int := 0;
  v_next date;
begin
  for r in
    select * from public.recurring_rules
    where active = true and next_run_on <= current_date
  loop
    -- Insert the transaction. user_id is set to created_by, or first member.
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
      coalesce(r.created_by, null),
      r.id
    );

    -- Compute next run date
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

-- Schedule daily at 06:00 UTC (~11:30 IST).
select cron.schedule(
  'process-recurring-rules',
  '0 6 * * *',
  $$ select public.process_recurring_rules(); $$
);
