-- ============================================================
-- Fix: Restore `email` in handle_new_user trigger
-- The rls_phase3.sql accidentally dropped email from the INSERT.
-- Run this in Supabase SQL Editor.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, team, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Unknown'),
    new.email,
    coalesce(new.raw_user_meta_data->>'team', 'backend'),
    'engineer'  -- everyone starts as engineer; admin assigns specific role
  );
  return new;
end;
$$;
