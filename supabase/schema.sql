-- =========================================================================
-- Expense Tracker — Supabase schema
-- Paste this ENTIRE file into Supabase Studio → SQL Editor → RUN.
-- Idempotent: safe to re-run.
-- =========================================================================

create extension if not exists "pgcrypto";

-- ---------- HOUSEHOLDS ---------------------------------------------------
create table if not exists public.households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  currency    text not null default 'INR',
  locale      text not null default 'en-IN',
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null
);

-- ---------- PROFILES (1-1 with auth.users) -------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  household_id  uuid references public.households(id) on delete set null,
  display_name  text,
  avatar_url    text,
  email         text,
  created_at    timestamptz not null default now()
);

-- Auto-create a profile when a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- CATEGORIES ---------------------------------------------------
create table if not exists public.categories (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households(id) on delete cascade,
  name            text not null,
  type            text not null check (type in ('expense','income','investment','transfer')),
  color           text not null default '#10b981',
  icon            text not null default 'circle',
  monthly_budget  numeric(14,2),
  archived        boolean not null default false,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  unique (household_id, name, type)
);
create index if not exists categories_household_idx on public.categories(household_id);

-- ---------- TRANSACTIONS -------------------------------------------------
create table if not exists public.transactions (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete restrict,
  category_id   uuid not null references public.categories(id) on delete restrict,
  type          text not null check (type in ('expense','income','investment','transfer')),
  amount        numeric(14,2) not null check (amount > 0),
  occurred_on   date not null default current_date,
  note          text,
  paid_by       uuid references public.profiles(id) on delete set null,
  recurring_id  uuid,
  receipt_url   text,
  created_at    timestamptz not null default now()
);
create index if not exists transactions_household_date_idx on public.transactions(household_id, occurred_on desc);
create index if not exists transactions_household_type_idx on public.transactions(household_id, type, occurred_on desc);
create index if not exists transactions_category_idx on public.transactions(category_id);

-- ---------- RECURRING RULES ---------------------------------------------
create table if not exists public.recurring_rules (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references public.households(id) on delete cascade,
  category_id   uuid not null references public.categories(id) on delete restrict,
  type          text not null check (type in ('expense','income','investment','transfer')),
  amount        numeric(14,2) not null,
  note          text,
  frequency     text not null check (frequency in ('daily','weekly','monthly','yearly')),
  day_of_month  int check (day_of_month between 1 and 31),
  next_run_on   date not null,
  active        boolean not null default true,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);
create index if not exists recurring_household_next_idx on public.recurring_rules(household_id, next_run_on);

-- ---------- INVESTMENT HOLDINGS (manual portfolio tracker) --------------
create table if not exists public.investment_holdings (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references public.households(id) on delete cascade,
  name            text not null,
  type            text not null,
  current_value   numeric(14,2) not null default 0,
  invested_value  numeric(14,2) not null default 0,
  notes           text,
  last_updated    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index if not exists holdings_household_idx on public.investment_holdings(household_id);

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================
alter table public.households          enable row level security;
alter table public.profiles            enable row level security;
alter table public.categories          enable row level security;
alter table public.transactions        enable row level security;
alter table public.recurring_rules     enable row level security;
alter table public.investment_holdings enable row level security;

-- Helper: current user's household
create or replace function public.current_household_id()
returns uuid language sql stable security definer set search_path = public as $$
  select household_id from public.profiles where id = auth.uid()
$$;

-- ---------- POLICIES -----------------------------------------------------
-- Profiles: read all in same household, update self
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (
    id = auth.uid()
    or (household_id is not null and household_id = public.current_household_id())
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles for insert
  with check (id = auth.uid());

-- Households: members can read; anyone authenticated can create
drop policy if exists households_select on public.households;
create policy households_select on public.households for select
  using (id = public.current_household_id() or created_by = auth.uid());

drop policy if exists households_insert on public.households;
create policy households_insert on public.households for insert
  with check (auth.uid() is not null);

drop policy if exists households_update on public.households;
create policy households_update on public.households for update
  using (id = public.current_household_id());

-- Generic per-household policies (all 4 ops)
do $$
declare t text;
begin
  for t in select unnest(array[
    'categories','transactions','recurring_rules','investment_holdings'
  ]) loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format(
      'create policy %I_select on public.%I for select using (household_id = public.current_household_id())',
      t, t);
    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format(
      'create policy %I_insert on public.%I for insert with check (household_id = public.current_household_id())',
      t, t);
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format(
      'create policy %I_update on public.%I for update using (household_id = public.current_household_id())',
      t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);
    execute format(
      'create policy %I_delete on public.%I for delete using (household_id = public.current_household_id())',
      t, t);
  end loop;
end $$;

-- =========================================================================
-- ATOMIC RPC: create a household, attach the current profile to it,
-- and seed default categories. Used by onboarding.
-- =========================================================================
create or replace function public.create_household_with_defaults(
  p_name text,
  p_currency text default 'INR',
  p_locale text default 'en-IN'
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_id   uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  insert into public.households (name, currency, locale, created_by)
  values (p_name, p_currency, p_locale, v_user)
  returning id into v_id;

  update public.profiles set household_id = v_id where id = v_user;

  -- Seed categories
  insert into public.categories (household_id, name, type, color, icon, monthly_budget, sort_order) values
    -- Expenses (essentials)
    (v_id, 'Groceries',       'expense',    '#22c55e', 'shopping-cart',  null, 10),
    (v_id, 'Rent / EMI',      'expense',    '#0ea5e9', 'home',           null, 11),
    (v_id, 'Utilities',       'expense',    '#14b8a6', 'plug',           null, 12),
    (v_id, 'Transport',       'expense',    '#f59e0b', 'car',            null, 13),
    (v_id, 'Fuel',            'expense',    '#f97316', 'fuel',           null, 14),
    -- Lifestyle
    (v_id, 'Dining',          'expense',    '#ef4444', 'utensils',       null, 20),
    (v_id, 'Shopping',        'expense',    '#ec4899', 'shopping-bag',   null, 21),
    (v_id, 'Entertainment',   'expense',    '#a855f7', 'film',           null, 22),
    (v_id, 'Travel',          'expense',    '#6366f1', 'plane',          null, 23),
    (v_id, 'Subscriptions',   'expense',    '#8b5cf6', 'tv',             null, 24),
    -- Health & family
    (v_id, 'Medical',         'expense',    '#06b6d4', 'heart-pulse',    null, 30),
    (v_id, 'Fitness',         'expense',    '#10b981', 'dumbbell',       null, 31),
    (v_id, 'Personal Care',   'expense',    '#d946ef', 'sparkles',       null, 32),
    (v_id, 'Kids',            'expense',    '#f472b6', 'baby',           null, 33),
    (v_id, 'Education',       'expense',    '#3b82f6', 'graduation-cap', null, 34),
    (v_id, 'Pets',            'expense',    '#84cc16', 'paw-print',      null, 35),
    -- Other
    (v_id, 'Gifts & Donations','expense',   '#eab308', 'gift',           null, 40),
    (v_id, 'Other Expense',   'expense',    '#64748b', 'circle',         null, 99),

    -- Income
    (v_id, 'Salary',          'income',     '#16a34a', 'briefcase',      null, 10),
    (v_id, 'Bonus',           'income',     '#059669', 'star',           null, 11),
    (v_id, 'Interest',        'income',     '#0d9488', 'percent',        null, 12),
    (v_id, 'Rental',          'income',     '#0891b2', 'building',       null, 13),
    (v_id, 'Other Income',    'income',     '#65a30d', 'circle',         null, 99),

    -- Investments
    (v_id, 'Mutual Funds',    'investment', '#2563eb', 'pie-chart',      null, 10),
    (v_id, 'Stocks',          'investment', '#7c3aed', 'trending-up',    null, 11),
    (v_id, 'FD / RD',         'investment', '#0284c7', 'landmark',       null, 12),
    (v_id, 'Gold',            'investment', '#ca8a04', 'coins',          null, 13),
    (v_id, 'Crypto',          'investment', '#f59e0b', 'bitcoin',        null, 14),
    (v_id, 'PF / NPS',        'investment', '#0ea5e9', 'shield',         null, 15),
    (v_id, 'Real Estate',     'investment', '#15803d', 'home',           null, 16),
    (v_id, 'Other Investment','investment', '#64748b', 'circle',         null, 99),

    -- Transfers
    (v_id, 'Transfer',        'transfer',   '#94a3b8', 'arrow-right-left', null, 10);

  return v_id;
end $$;

-- Convenience: join household by id (for the second person)
create or replace function public.join_household(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.households where id = p_id) then
    raise exception 'household not found';
  end if;
  update public.profiles set household_id = p_id where id = auth.uid();
end $$;

-- Realtime
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.investment_holdings;
