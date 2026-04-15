-- ============================================================
-- Run this in Supabase SQL Editor
-- Adds is_admin support to profiles
-- ============================================================

-- 1. Add is_admin column
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- 2. Allow admins to read ALL profiles (needed for admin page user list)
create policy "profiles: admin read all"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- 3. Allow admins to update ANY profile's role and is_admin
create policy "profiles: admin update all"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );
