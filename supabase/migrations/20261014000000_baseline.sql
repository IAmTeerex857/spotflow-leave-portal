-- ============================================================
-- Baseline: snapshot of the live Leave Portal schema (project
-- vomkjutzcgqivzlzmsoc) as of 2026-10-14, reconstructed from
-- pg_catalog. Replaces the hand-run scripts that used to live in
-- supabase/*.sql (see git history before this commit).
--
-- Already applied on the remote project — it is marked as applied
-- with `supabase migration repair` and only runs on fresh databases.
-- ============================================================

-- ── Tables ───────────────────────────────────────────────────

create table if not exists public.profiles (
  id                        uuid primary key references auth.users(id) on delete cascade,
  full_name                 text not null,
  email                     text not null unique,
  team                      text not null,
  role                      text not null default 'engineer'
    constraint profiles_role_check check (role in (
      'engineer', 'frontend_engineer', 'backend_engineer', 'qa_engineer',
      'operations', 'marketing', 'product_designer', 'product_manager',
      'frontend_line_manager', 'backend_line_manager', 'engineering_manager',
      'head_of_product', 'head_of_operations', 'line_manager'
    )),
  is_admin                  boolean not null default false,
  leave_balance_adjustment  integer not null default 0,
  created_at                timestamptz not null default now()
);

create table if not exists public.leave_requests (
  id                  uuid primary key default gen_random_uuid(),
  requester_id        uuid not null references public.profiles(id) on delete cascade,
  leave_type          text not null
    constraint leave_requests_leave_type_check check (leave_type in ('annual', 'sick', 'personal', 'other')),
  start_date          date not null,
  end_date            date not null,
  duration_days       integer not null,
  reason              text not null,
  cover_notes         text,
  cover_person_email  text,
  status              text not null default 'pending'
    constraint leave_requests_status_check check (status in ('pending', 'pending_em_review', 'approved', 'rejected', 'cancelled')),
  approver_id         uuid references public.profiles(id),
  approver_comment    text,
  actioned_at         timestamptz,
  created_at          timestamptz not null default now(),
  constraint leave_requests_check check (end_date >= start_date)
);

create table if not exists public.email_reminders (
  id             uuid primary key default gen_random_uuid(),
  request_id     uuid not null references public.leave_requests(id) on delete cascade,
  reminder_type  text not null
    constraint email_reminders_reminder_type_check check (reminder_type in ('7_day', '3_day', '1_day')),
  sent_at        timestamptz not null default now(),
  unique (request_id, reminder_type)
);

create table if not exists public.user_tokens (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  provider       text not null default 'google',
  refresh_token  text not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.profiles        enable row level security;
alter table public.leave_requests  enable row level security;
alter table public.email_reminders enable row level security;
alter table public.user_tokens     enable row level security;

-- ── Functions & triggers ─────────────────────────────────────

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
$$;

-- ── Policies: profiles ───────────────────────────────────────

create policy "profiles: authenticated read" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles: own update" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles: admin read all" on public.profiles
  for select using (public.is_admin());

create policy "profiles: admin update all" on public.profiles
  for update using (public.is_admin());

create policy "profiles: admin can update any profile" on public.profiles
  for update to authenticated
  using (exists (select 1 from public.profiles profiles_1 where profiles_1.id = auth.uid() and profiles_1.is_admin = true));

create policy "profiles: service role full access" on public.profiles
  using (auth.role() = 'service_role');

-- ── Policies: leave_requests ─────────────────────────────────

create policy "leave_requests: own read" on public.leave_requests
  for select using (auth.uid() = requester_id);

create policy "leave_requests: own insert" on public.leave_requests
  for insert with check (auth.uid() = requester_id);

create policy "leave_requests: own update pending" on public.leave_requests
  for update using (auth.uid() = requester_id and status = 'pending')
  with check (auth.uid() = requester_id);

create policy "leave_requests: own delete" on public.leave_requests
  for delete using (auth.uid() = requester_id);

create policy "leave_requests: calendar visibility" on public.leave_requests
  for select to authenticated using (status in ('approved', 'pending'));

create policy "leave_requests: manager read" on public.leave_requests
  for select using (exists (
    select 1 from public.profiles manager
    join public.profiles requester on requester.id = leave_requests.requester_id
    where manager.id = auth.uid() and (
      (manager.role = 'frontend_line_manager' and requester.team = 'frontend' and requester.role in ('engineer', 'frontend_engineer'))
      or (manager.role = 'backend_line_manager' and requester.team = 'backend' and requester.role in ('engineer', 'backend_engineer'))
      or (manager.role = 'engineering_manager' and requester.role in ('engineer', 'frontend_engineer', 'backend_engineer', 'frontend_line_manager', 'backend_line_manager', 'line_manager'))
      or (manager.role = 'head_of_product' and (requester.role in ('product_designer', 'product_manager') or requester.team in ('product', 'design')))
      or (manager.role = 'line_manager' and manager.team = requester.team)
    )
  ));

create policy "leave_requests: manager update" on public.leave_requests
  for update using (exists (
    select 1 from public.profiles manager
    join public.profiles requester on requester.id = leave_requests.requester_id
    where manager.id = auth.uid() and (
      (manager.role = 'frontend_line_manager' and requester.team = 'frontend' and requester.role in ('engineer', 'frontend_engineer'))
      or (manager.role = 'backend_line_manager' and requester.team = 'backend' and requester.role in ('engineer', 'backend_engineer'))
      or (manager.role = 'engineering_manager' and requester.role in ('engineer', 'frontend_engineer', 'backend_engineer', 'frontend_line_manager', 'backend_line_manager', 'line_manager'))
      or (manager.role = 'head_of_product' and (requester.role in ('product_designer', 'product_manager') or requester.team in ('product', 'design')))
      or (manager.role = 'line_manager' and manager.team = requester.team)
    )
  ));

create policy "leave_requests: manager read team" on public.leave_requests
  for select using (exists (
    select 1 from public.profiles manager
    join public.profiles requester on requester.id = leave_requests.requester_id
    where manager.id = auth.uid() and (
      (manager.role = 'backend_line_manager' and requester.team = 'backend' and requester.role in ('engineer', 'backend_engineer'))
      or (manager.role = 'frontend_line_manager' and requester.team = 'frontend' and requester.role in ('engineer', 'frontend_engineer'))
      or (manager.role = 'engineering_manager' and requester.role in ('engineer', 'frontend_engineer', 'backend_engineer', 'qa_engineer', 'frontend_line_manager', 'backend_line_manager', 'line_manager'))
      or (manager.role = 'head_of_product' and requester.role in ('product_designer', 'product_manager'))
      or (manager.role = 'head_of_operations' and requester.role in ('operations', 'marketing'))
      or (manager.role = 'line_manager' and manager.team = requester.team)
    )
  ));

create policy "leave_requests: manager update team" on public.leave_requests
  for update using (exists (
    select 1 from public.profiles manager
    join public.profiles requester on requester.id = leave_requests.requester_id
    where manager.id = auth.uid() and (
      (manager.role = 'backend_line_manager' and requester.team = 'backend' and requester.role in ('engineer', 'backend_engineer'))
      or (manager.role = 'frontend_line_manager' and requester.team = 'frontend' and requester.role in ('engineer', 'frontend_engineer'))
      or (manager.role = 'engineering_manager' and requester.role in ('engineer', 'frontend_engineer', 'backend_engineer', 'qa_engineer', 'frontend_line_manager', 'backend_line_manager', 'line_manager'))
      or (manager.role = 'head_of_product' and requester.role in ('product_designer', 'product_manager'))
      or (manager.role = 'head_of_operations' and requester.role in ('operations', 'marketing'))
      or (manager.role = 'line_manager' and manager.team = requester.team)
    )
  ));

-- ── Policies: service-only tables ────────────────────────────

create policy "email_reminders: service role only" on public.email_reminders
  using (auth.role() = 'service_role');

create policy "user_tokens: service role only" on public.user_tokens
  using (auth.role() = 'service_role');
