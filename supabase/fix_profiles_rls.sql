-- ============================================================
-- Fix: Allow authenticated users to read all profiles
-- Without this, the manager RLS policy's inner join on
-- profiles (to check requester's role/team) returns empty
-- for other users' rows, causing managers to see no requests.
-- ============================================================

-- Drop the restrictive "own only" read policy
drop policy if exists "profiles: own read" on public.profiles;

-- Allow any authenticated user to read all profiles
-- (profiles only contain name/team/role — no sensitive data)
create policy "profiles: authenticated read"
  on public.profiles for select
  using (auth.role() = 'authenticated');
