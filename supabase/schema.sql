-- ============================================================
-- Spotflow Leave Portal — Database Schema
-- Run this entire script in the Supabase SQL Editor
-- ============================================================

-- ── 1. PROFILES ──────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null unique,
  team        text not null check (team in ('backend', 'frontend', 'product')),
  role        text not null default 'engineer'
                check (role in ('engineer', 'line_manager', 'engineering_manager', 'head_of_product')),
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "profiles: own read"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile (name/team only — role managed by admin)
create policy "profiles: own update"
  on public.profiles for update
  using (auth.uid() = id);

-- Service role can do everything (used by Edge Functions / admin)
create policy "profiles: service role full access"
  on public.profiles
  using (auth.role() = 'service_role');


-- ── 2. AUTO-CREATE PROFILE ON SIGN-UP ────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, team)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Unknown'),
    new.email,
    coalesce(new.raw_user_meta_data->>'team', 'backend')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── 3. LEAVE REQUESTS ────────────────────────────────────────
create table if not exists public.leave_requests (
  id                uuid primary key default gen_random_uuid(),
  requester_id      uuid not null references public.profiles(id) on delete cascade,
  leave_type        text not null check (leave_type in ('annual', 'sick', 'personal', 'other')),
  start_date        date not null,
  end_date          date not null check (end_date >= start_date),
  duration_days     int not null,
  reason            text not null,
  cover_notes       text,
  status            text not null default 'pending'
                      check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  approver_id       uuid references public.profiles(id),
  approver_comment  text,
  actioned_at       timestamptz,
  created_at        timestamptz not null default now()
);

alter table public.leave_requests enable row level security;

-- Engineers: read and insert their own requests
create policy "leave_requests: own read"
  on public.leave_requests for select
  using (auth.uid() = requester_id);

create policy "leave_requests: own insert"
  on public.leave_requests for insert
  with check (auth.uid() = requester_id);

-- Line managers: read all requests from their team
create policy "leave_requests: manager read"
  on public.leave_requests for select
  using (
    exists (
      select 1 from public.profiles manager
      join public.profiles requester on requester.id = leave_requests.requester_id
      where manager.id = auth.uid()
        and manager.role = 'line_manager'
        and manager.team = requester.team
    )
  );

-- Line managers: update (approve/reject) requests from their team
create policy "leave_requests: manager update"
  on public.leave_requests for update
  using (
    exists (
      select 1 from public.profiles manager
      join public.profiles requester on requester.id = leave_requests.requester_id
      where manager.id = auth.uid()
        and manager.role = 'line_manager'
        and manager.team = requester.team
    )
  );

-- Engineering manager: read + update backend and frontend requests
create policy "leave_requests: eng manager read"
  on public.leave_requests for select
  using (
    exists (
      select 1 from public.profiles manager
      join public.profiles requester on requester.id = leave_requests.requester_id
      where manager.id = auth.uid()
        and manager.role = 'engineering_manager'
        and requester.team in ('backend', 'frontend')
    )
  );

create policy "leave_requests: eng manager update"
  on public.leave_requests for update
  using (
    exists (
      select 1 from public.profiles manager
      join public.profiles requester on requester.id = leave_requests.requester_id
      where manager.id = auth.uid()
        and manager.role = 'engineering_manager'
        and requester.team in ('backend', 'frontend')
    )
  );

-- Head of product: read + update product team requests
create policy "leave_requests: head of product read"
  on public.leave_requests for select
  using (
    exists (
      select 1 from public.profiles manager
      join public.profiles requester on requester.id = leave_requests.requester_id
      where manager.id = auth.uid()
        and manager.role = 'head_of_product'
        and requester.team = 'product'
    )
  );

create policy "leave_requests: head of product update"
  on public.leave_requests for update
  using (
    exists (
      select 1 from public.profiles manager
      join public.profiles requester on requester.id = leave_requests.requester_id
      where manager.id = auth.uid()
        and manager.role = 'head_of_product'
        and requester.team = 'product'
    )
  );


-- ── 4. EMAIL REMINDERS (deduplication) ───────────────────────
create table if not exists public.email_reminders (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.leave_requests(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('7_day', '3_day', '1_day')),
  sent_at       timestamptz not null default now(),
  unique (request_id, reminder_type)
);

alter table public.email_reminders enable row level security;

-- Only service role (Edge Functions) can access this table
create policy "email_reminders: service role only"
  on public.email_reminders
  using (auth.role() = 'service_role');
