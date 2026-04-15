-- ============================================================
-- FIX: Infinite recursion in RLS policies
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Drop the broken recursive policies
drop policy if exists "profiles: admin read all" on public.profiles;
drop policy if exists "profiles: admin update all" on public.profiles;

-- 2. Create a security definer function to check admin status
--    (security definer = runs as DB owner, bypasses RLS — no recursion)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$;

-- 3. Recreate admin policies using the function (no more recursion)
create policy "profiles: admin read all"
  on public.profiles for select
  using (public.is_admin());

create policy "profiles: admin update all"
  on public.profiles for update
  using (public.is_admin());
