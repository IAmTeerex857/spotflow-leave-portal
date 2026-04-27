-- ============================================================
-- Google OAuth onboarding: set team='pending' as sentinel
-- for new Google sign-ins so the app can route them to /onboarding
-- Run this in Supabase SQL Editor
-- ============================================================

-- Allow 'pending' as a temporary team value for new Google users
alter table public.profiles
  drop constraint if exists profiles_team_check;

alter table public.profiles
  add constraint profiles_team_check
  check (team in ('backend', 'frontend', 'product', 'design', 'pending'));

-- Update trigger: Google OAuth users get team='pending' since
-- Google doesn't pass team info. Email/password users still get
-- team from their signup metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, team, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      'Unknown'
    ),
    new.email,
    coalesce(new.raw_user_meta_data->>'team', 'pending'),
    'engineer'
  );
  return new;
end;
$$;
