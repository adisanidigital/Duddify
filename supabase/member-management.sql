-- =========================================================================
-- Member management — paste into Supabase SQL Editor and Run.
-- Adds an RPC that lets any household member remove another member.
-- (Editing your own nickname is already permitted by existing RLS.)
-- =========================================================================

create or replace function public.remove_household_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_caller_hh uuid;
  v_target_hh uuid;
begin
  if v_caller is null then raise exception 'not authenticated'; end if;

  select household_id into v_caller_hh from public.profiles where id = v_caller;
  select household_id into v_target_hh from public.profiles where id = p_user_id;

  if v_caller_hh is null then
    raise exception 'caller has no household';
  end if;
  if v_target_hh is null or v_target_hh <> v_caller_hh then
    raise exception 'target not in your household';
  end if;
  if p_user_id = v_caller then
    raise exception 'use leave_household to remove yourself';
  end if;

  -- Detach the target user from the household.
  update public.profiles set household_id = null where id = p_user_id;
end $$;

create or replace function public.leave_household()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
begin
  if v_caller is null then raise exception 'not authenticated'; end if;
  update public.profiles set household_id = null where id = v_caller;
end $$;

-- Update any household member's display name (nickname) — shared across the
-- household. Trims, capped at 60 chars, must not be empty.
create or replace function public.update_member_nickname(
  p_user_id uuid,
  p_nickname text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller     uuid := auth.uid();
  v_caller_hh  uuid;
  v_target_hh  uuid;
  v_clean      text;
begin
  if v_caller is null then raise exception 'not authenticated'; end if;
  v_clean := nullif(btrim(p_nickname), '');
  if v_clean is null then raise exception 'nickname required'; end if;
  if length(v_clean) > 60 then v_clean := left(v_clean, 60); end if;

  select household_id into v_caller_hh from public.profiles where id = v_caller;
  select household_id into v_target_hh from public.profiles where id = p_user_id;

  if v_caller_hh is null then
    raise exception 'caller has no household';
  end if;
  if v_target_hh is null or v_target_hh <> v_caller_hh then
    raise exception 'target not in your household';
  end if;

  update public.profiles set display_name = v_clean where id = p_user_id;
end $$;
