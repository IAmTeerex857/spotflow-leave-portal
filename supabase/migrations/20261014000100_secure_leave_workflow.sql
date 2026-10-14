-- ============================================================
-- Secure leave workflow
--
-- * Only Google sign-ins from @spotflow.one can create accounts.
-- * Users can no longer edit their own role / is_admin / balance.
-- * Approval routing lives in one place (approver_role_for) and is
--   used by RLS, the approval RPC, the queue and email routing.
-- * Status changes only happen through RPCs that check the caller:
--   decide_leave_request (approvers) and cancel_leave_request (owner).
-- * duration_days is computed by the database from public_holidays,
--   and the 20-day allowance is enforced on submit.
-- * Coworkers see who is away (team_calendar) but not reasons.
-- ============================================================


-- ── 1. Public holidays (replaces the hard-coded list in the app) ──

create table if not exists public.public_holidays (
  date  date primary key,
  name  text not null
);

alter table public.public_holidays enable row level security;

create policy "public_holidays: authenticated read" on public.public_holidays
  for select to authenticated using (true);

create policy "public_holidays: admin write" on public.public_holidays
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.public_holidays (date, name) values
  ('2025-01-01', 'New Year''s Day'),
  ('2025-03-30', 'Eid al-Fitr'),
  ('2025-03-31', 'Eid al-Fitr (Holiday)'),
  ('2025-04-18', 'Good Friday'),
  ('2025-04-21', 'Easter Monday'),
  ('2025-05-01', 'Workers'' Day'),
  ('2025-06-06', 'Eid al-Adha'),
  ('2025-06-07', 'Eid al-Adha (Holiday)'),
  ('2025-06-12', 'Democracy Day'),
  ('2025-10-01', 'Independence Day'),
  ('2025-12-25', 'Christmas Day'),
  ('2025-12-26', 'Boxing Day'),
  ('2026-01-01', 'New Year''s Day'),
  ('2026-03-20', 'Eid al-Fitr'),
  ('2026-03-21', 'Eid al-Fitr (Holiday)'),
  ('2026-04-03', 'Good Friday'),
  ('2026-04-06', 'Easter Monday'),
  ('2026-05-01', 'Workers'' Day'),
  ('2026-05-27', 'Eid al-Adha'),
  ('2026-05-28', 'Eid al-Adha (Holiday)'),
  ('2026-06-12', 'Democracy Day'),
  ('2026-10-01', 'Independence Day'),
  ('2026-12-25', 'Christmas Day'),
  ('2026-12-26', 'Boxing Day'),
  -- 2027: fixed-date holidays and Easter are exact. Islamic holidays are
  -- provisional until the Federal Government announces them; weekday
  -- substitutes for weekend holidays are added when declared.
  ('2027-01-01', 'New Year''s Day'),
  ('2027-03-10', 'Eid al-Fitr (provisional)'),
  ('2027-03-11', 'Eid al-Fitr Holiday (provisional)'),
  ('2027-03-26', 'Good Friday'),
  ('2027-03-29', 'Easter Monday'),
  ('2027-05-01', 'Workers'' Day'),
  ('2027-05-17', 'Eid al-Adha (provisional)'),
  ('2027-05-18', 'Eid al-Adha Holiday (provisional)'),
  ('2027-06-12', 'Democracy Day'),
  ('2027-10-01', 'Independence Day'),
  ('2027-12-25', 'Christmas Day'),
  ('2027-12-26', 'Boxing Day')
on conflict (date) do nothing;


-- ── 2. New columns ──────────────────────────────────────────

-- Keep the line manager's decision when the engineering manager later
-- confirms or overrides (approver_id then holds the final decider).
alter table public.leave_requests
  add column if not exists line_manager_id uuid references public.profiles(id),
  add column if not exists line_manager_actioned_at timestamptz,
  add column if not exists cancelled_at timestamptz;

update public.leave_requests
set line_manager_id = approver_id,
    line_manager_actioned_at = actioned_at
where status = 'pending_em_review' and line_manager_id is null;

-- Team and cover-email rules are enforced in the triggers below rather
-- than as CHECK constraints: some existing rows predate them, and a
-- constraint would block unrelated updates to those rows.


-- ── 3. Calendar maths ───────────────────────────────────────

create or replace function public.annual_allowance()
returns integer language sql immutable as $$ select 20 $$;

-- Working days between two dates (inclusive), excluding weekends and
-- public holidays. Returns 0 when p_end < p_start.
create or replace function public.working_days(p_start date, p_end date)
returns integer language sql stable set search_path = public as $$
  select count(*)::int
  from generate_series(p_start, p_end, interval '1 day') as d
  where extract(isodow from d) < 6
    and not exists (select 1 from public.public_holidays h where h.date = d::date);
$$;

-- The part of a leave period that falls in a given calendar year.
create or replace function public.working_days_in_year(p_start date, p_end date, p_year integer)
returns integer language sql stable set search_path = public as $$
  select public.working_days(greatest(p_start, make_date(p_year, 1, 1)),
                             least(p_end, make_date(p_year, 12, 31)));
$$;


-- ── 4. Approval routing (single source of truth) ────────────

-- Which role approves a request from someone with this role/team.
create or replace function public.approver_role_for(p_role text, p_team text)
returns text language sql immutable as $$
  select case
    when p_role = 'frontend_engineer'                         then 'frontend_line_manager'
    when p_role = 'backend_engineer'                          then 'backend_line_manager'
    when p_role = 'engineer' and p_team = 'frontend'          then 'frontend_line_manager'
    when p_role = 'engineer' and p_team = 'backend'           then 'backend_line_manager'
    when p_role = 'qa_engineer'                               then 'engineering_manager'
    when p_role in ('operations', 'marketing')                then 'head_of_operations'
    when p_role in ('product_designer', 'product_manager')    then 'head_of_product'
    when p_role in ('frontend_line_manager', 'backend_line_manager', 'line_manager')
                                                              then 'engineering_manager'
    when p_role = 'engineering_manager'                       then 'head_of_product'
    when p_role = 'head_of_product'                           then 'head_of_operations'
    when p_role = 'head_of_operations'                        then 'head_of_product'
    -- New joiners keep the default 'engineer' role until an admin assigns
    -- one, so route them by the team they picked at onboarding.
    when p_team in ('product', 'design')                      then 'head_of_product'
    when p_team in ('operations', 'marketing')                then 'head_of_operations'
    else 'engineering_manager'
  end;
$$;

-- Who acts on a request at its current stage. Line-manager approvals go
-- to pending_em_review, where the engineering manager confirms.
create or replace function public.stage_approver_role(p_status text, p_role text, p_team text)
returns text language sql immutable as $$
  select case p_status
    when 'pending'           then public.approver_role_for(p_role, p_team)
    when 'pending_em_review' then 'engineering_manager'
  end;
$$;

-- Can the current user approve/reject this request right now?
create or replace function public.can_act_on(p_requester_id uuid, p_status text)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_me        public.profiles;
  v_requester public.profiles;
  v_stage     text;
begin
  if auth.uid() is null or auth.uid() = p_requester_id then
    return false;
  end if;

  select * into v_me from public.profiles where id = auth.uid();
  select * into v_requester from public.profiles where id = p_requester_id;
  v_stage := public.stage_approver_role(p_status, v_requester.role, v_requester.team);

  if v_stage is null then
    return false;
  end if;
  if v_me.role = v_stage then
    return true;
  end if;

  -- Nobody else holds the approver role (vacancy): admins can step in.
  return coalesce(v_me.is_admin, false) and not exists (
    select 1 from public.profiles where role = v_stage and id <> p_requester_id
  );
end;
$$;

-- Can the current user see this person's leave requests and balance?
create or replace function public.can_view_user(p_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() = p_user_id
      or public.is_admin()
      or exists (
        select 1
        from public.profiles me, public.profiles r
        where me.id = auth.uid() and r.id = p_user_id and (
          me.role = public.approver_role_for(r.role, r.team)
          or (me.role = 'engineering_manager'
              and public.approver_role_for(r.role, r.team) in ('frontend_line_manager', 'backend_line_manager'))
        )
      );
$$;


-- ── 5. Guards on direct writes ──────────────────────────────

-- Users may rename themselves and pick a team once (onboarding); role,
-- admin flag and balance adjustment are admin-only.
create or replace function public.profiles_guard()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.team is distinct from old.team
     and new.team not in ('backend', 'frontend', 'product', 'design', 'operations', 'marketing', 'pending') then
    raise exception 'Unknown team "%"', new.team using errcode = '22023';
  end if;

  -- Service role, SQL editor and security-definer functions are trusted.
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.email is distinct from old.email
     or new.role is distinct from old.role
     or new.is_admin is distinct from old.is_admin
     or new.leave_balance_adjustment is distinct from old.leave_balance_adjustment
     or new.created_at is distinct from old.created_at then
    raise exception 'Only an admin can change role, admin access or leave balance'
      using errcode = '42501';
  end if;

  if new.team is distinct from old.team and old.team <> 'pending' then
    raise exception 'Ask an admin to change your team' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard
  before update on public.profiles
  for each row execute function public.profiles_guard();


-- Employees submit and edit; the database decides duration and status.
create or replace function public.leave_requests_before_write()
returns trigger language plpgsql set search_path = public as $$
declare
  v_trusted   boolean := current_user not in ('authenticated', 'anon');
  v_allowance integer;
  v_committed integer;
  v_needed    integer;
  v_year      integer;
begin
  if not v_trusted then
    -- Direct writes from the app always (re)submit a pending request.
    new.status := 'pending';
    new.approver_id := null;
    new.approver_comment := null;
    new.actioned_at := null;
    new.line_manager_id := null;
    new.line_manager_actioned_at := null;
    new.cancelled_at := null;
    if tg_op = 'UPDATE' then
      new.requester_id := old.requester_id;
      new.created_at := old.created_at;
    else
      new.created_at := now();
    end if;
  end if;

  if not v_trusted or tg_op = 'INSERT'
     or new.start_date is distinct from old.start_date
     or new.end_date is distinct from old.end_date then
    new.duration_days := public.working_days(new.start_date, new.end_date);
    if new.duration_days <= 0 then
      raise exception 'The selected dates contain no working days' using errcode = '22023';
    end if;
  end if;

  if tg_op = 'INSERT' or new.cover_person_email is distinct from old.cover_person_email then
    new.cover_person_email := nullif(lower(trim(new.cover_person_email)), '');
    if new.cover_person_email is not null
       and new.cover_person_email !~ '^[^@[:space:]]+@spotflow\.one$' then
      raise exception 'Cover person must have an @spotflow.one email address' using errcode = '22023';
    end if;
  end if;

  if v_trusted then
    return new;
  end if;

  if exists (
    select 1 from public.leave_requests l
    where l.requester_id = new.requester_id
      and l.id <> new.id
      and l.status in ('pending', 'pending_em_review', 'approved')
      and l.start_date <= new.end_date
      and l.end_date >= new.start_date
  ) then
    raise exception 'You already have leave booked that overlaps these dates' using errcode = '22023';
  end if;

  select public.annual_allowance() + leave_balance_adjustment
  into v_allowance
  from public.profiles where id = new.requester_id;

  for v_year in extract(year from new.start_date)::int .. extract(year from new.end_date)::int loop
    select coalesce(sum(public.working_days_in_year(l.start_date, l.end_date, v_year)), 0)
    into v_committed
    from public.leave_requests l
    where l.requester_id = new.requester_id
      and l.id <> new.id
      and l.status in ('pending', 'pending_em_review', 'approved')
      and l.start_date <= make_date(v_year, 12, 31)
      and l.end_date >= make_date(v_year, 1, 1);

    v_needed := public.working_days_in_year(new.start_date, new.end_date, v_year);

    if v_committed + v_needed > v_allowance then
      raise exception 'This request needs % day(s) in %, but only % remain once pending requests are counted',
        v_needed, v_year, greatest(0, v_allowance - v_committed)
        using errcode = '22023';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists leave_requests_before_write on public.leave_requests;
create trigger leave_requests_before_write
  before insert or update on public.leave_requests
  for each row execute function public.leave_requests_before_write();


-- ── 6. Workflow RPCs ────────────────────────────────────────

create or replace function public.decide_leave_request(
  p_request_id uuid,
  p_decision   text,               -- 'approve' | 'reject'
  p_comment    text default null,
  p_start_date date default null,  -- approvers may adjust the dates
  p_end_date   date default null
)
returns public.leave_requests
language plpgsql security definer set search_path = public as $$
declare
  v_request   public.leave_requests;
  v_requester public.profiles;
  v_stage     text;
  v_comment   text := nullif(trim(p_comment), '');
begin
  select * into v_request from public.leave_requests where id = p_request_id for update;
  if not found then
    raise exception 'Leave request not found' using errcode = 'P0002';
  end if;

  if not public.can_act_on(v_request.requester_id, v_request.status) then
    raise exception 'You are not the approver for this request at its current stage' using errcode = '42501';
  end if;

  select * into v_requester from public.profiles where id = v_request.requester_id;
  v_stage := public.stage_approver_role(v_request.status, v_requester.role, v_requester.team);

  if p_decision = 'reject' then
    if v_comment is null then
      raise exception 'A reason is required to reject a request' using errcode = '22023';
    end if;

    update public.leave_requests
    set status = 'rejected',
        approver_id = auth.uid(),
        approver_comment = v_comment,
        actioned_at = now()
    where id = p_request_id
    returning * into v_request;

  elsif p_decision = 'approve' then
    if v_stage in ('frontend_line_manager', 'backend_line_manager') then
      -- Line manager approval: hand over to the engineering manager.
      update public.leave_requests
      set start_date = coalesce(p_start_date, start_date),
          end_date = coalesce(p_end_date, end_date),
          status = 'pending_em_review',
          approver_id = auth.uid(),
          approver_comment = v_comment,
          actioned_at = now(),
          line_manager_id = auth.uid(),
          line_manager_actioned_at = now()
      where id = p_request_id
      returning * into v_request;
    else
      update public.leave_requests
      set start_date = coalesce(p_start_date, start_date),
          end_date = coalesce(p_end_date, end_date),
          status = 'approved',
          approver_id = auth.uid(),
          approver_comment = coalesce(v_comment, approver_comment),
          actioned_at = now()
      where id = p_request_id
      returning * into v_request;
    end if;

  else
    raise exception 'Unknown decision "%"', p_decision using errcode = '22023';
  end if;

  return v_request;
end;
$$;

-- The requester withdraws leave that hasn't started yet. The record is
-- kept as 'cancelled' and the days return to their balance.
create or replace function public.cancel_leave_request(p_request_id uuid)
returns public.leave_requests
language plpgsql security definer set search_path = public as $$
declare
  v_request public.leave_requests;
begin
  select * into v_request from public.leave_requests where id = p_request_id for update;
  if not found or v_request.requester_id <> auth.uid() then
    raise exception 'Leave request not found' using errcode = 'P0002';
  end if;
  if v_request.status not in ('pending', 'pending_em_review', 'approved') then
    raise exception 'Only pending or approved leave can be cancelled' using errcode = '22023';
  end if;
  if v_request.start_date <= current_date then
    raise exception 'Leave that has already started can''t be cancelled. Ask your manager.' using errcode = '22023';
  end if;

  update public.leave_requests
  set status = 'cancelled', cancelled_at = now()
  where id = p_request_id
  returning * into v_request;

  return v_request;
end;
$$;

-- Requests the current user can act on now.
create or replace function public.approval_queue()
returns table (
  id                 uuid,
  requester_id       uuid,
  requester_name     text,
  requester_team     text,
  requester_role     text,
  leave_type         text,
  start_date         date,
  end_date           date,
  duration_days      integer,
  reason             text,
  cover_notes        text,
  status             text,
  created_at         timestamptz,
  line_manager_name  text
)
language sql stable security definer set search_path = public as $$
  select l.id, l.requester_id, p.full_name, p.team, p.role,
         l.leave_type, l.start_date, l.end_date, l.duration_days,
         l.reason, l.cover_notes, l.status, l.created_at, lm.full_name
  from public.leave_requests l
  join public.profiles p on p.id = l.requester_id
  left join public.profiles lm on lm.id = l.line_manager_id
  where l.status in ('pending', 'pending_em_review')
    and public.can_act_on(l.requester_id, l.status)
  order by l.created_at;
$$;

-- Who is away: names and dates only, for everyone signed in.
create or replace function public.team_calendar(p_from date, p_to date)
returns table (
  id            uuid,
  requester_id  uuid,
  full_name     text,
  start_date    date,
  end_date      date,
  status        text
)
language sql stable security definer set search_path = public as $$
  select l.id, l.requester_id, p.full_name, l.start_date, l.end_date, l.status
  from public.leave_requests l
  join public.profiles p on p.id = l.requester_id
  where auth.uid() is not null
    and l.status in ('pending', 'pending_em_review', 'approved')
    and l.start_date <= p_to
    and l.end_date >= p_from
  order by l.start_date;
$$;

-- Leave balances for one year. Only returns people the caller may see
-- (themselves; their reports if a manager; everyone if admin).
create or replace function public.leave_balances(p_user_ids uuid[] default null, p_year integer default null)
returns table (
  user_id     uuid,
  full_name   text,
  team        text,
  role        text,
  allowance   integer,
  adjustment  integer,
  used        integer,
  pending     integer,
  remaining   integer
)
language sql stable security definer set search_path = public as $$
  with yr as (
    select coalesce(p_year, extract(year from current_date)::int) as y
  ),
  totals as (
    select p.id, p.full_name, p.team, p.role, p.leave_balance_adjustment,
           public.annual_allowance() + p.leave_balance_adjustment as allowance,
           coalesce(sum(public.working_days_in_year(l.start_date, l.end_date, yr.y))
                    filter (where l.status = 'approved'), 0)::int as used,
           coalesce(sum(public.working_days_in_year(l.start_date, l.end_date, yr.y))
                    filter (where l.status in ('pending', 'pending_em_review')), 0)::int as pending
    from public.profiles p
    cross join yr
    left join public.leave_requests l
      on l.requester_id = p.id
     and l.start_date <= make_date(yr.y, 12, 31)
     and l.end_date >= make_date(yr.y, 1, 1)
    where (p_user_ids is null or p.id = any (p_user_ids))
      and public.can_view_user(p.id)
    group by p.id, yr.y
  )
  select id, full_name, team, role, allowance, leave_balance_adjustment, used, pending,
         greatest(0, allowance - used)
  from totals
  order by full_name;
$$;


-- ── 7. Sign-up: Google accounts on @spotflow.one only ───────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.raw_app_meta_data->>'provider', '') <> 'google' then
    raise exception 'Sign in with your Spotflow Google account' using errcode = '42501';
  end if;
  if lower(split_part(new.email, '@', 2)) <> 'spotflow.one' then
    raise exception 'Only @spotflow.one accounts can use the Leave Portal' using errcode = '42501';
  end if;

  insert into public.profiles (id, full_name, email, team, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Unknown'),
    new.email,
    'pending',
    'engineer'
  );
  return new;
end;
$$;


-- ── 8. Policies ─────────────────────────────────────────────

-- profiles
drop policy if exists "profiles: own update" on public.profiles;
drop policy if exists "profiles: admin can update any profile" on public.profiles;

create policy "profiles: own update" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- leave_requests: replace every old policy
drop policy if exists "leave_requests: own read" on public.leave_requests;
drop policy if exists "leave_requests: own insert" on public.leave_requests;
drop policy if exists "leave_requests: own update pending" on public.leave_requests;
drop policy if exists "leave_requests: own delete" on public.leave_requests;
drop policy if exists "leave_requests: calendar visibility" on public.leave_requests;
drop policy if exists "leave_requests: manager read" on public.leave_requests;
drop policy if exists "leave_requests: manager update" on public.leave_requests;
drop policy if exists "leave_requests: manager read team" on public.leave_requests;
drop policy if exists "leave_requests: manager update team" on public.leave_requests;

create policy "leave_requests: read own, reports, or as decider" on public.leave_requests
  for select to authenticated
  using (public.can_view_user(requester_id) or approver_id = auth.uid() or line_manager_id = auth.uid());

create policy "leave_requests: submit own" on public.leave_requests
  for insert to authenticated
  with check (requester_id = auth.uid());

create policy "leave_requests: edit own pending" on public.leave_requests
  for update to authenticated
  using (requester_id = auth.uid() and status = 'pending')
  with check (requester_id = auth.uid());

create policy "leave_requests: delete own pending or rejected" on public.leave_requests
  for delete to authenticated
  using (requester_id = auth.uid() and status in ('pending', 'rejected'));


-- ── 9. Privileges ───────────────────────────────────────────

-- Nothing in the app runs as anon against these tables.
revoke all on public.profiles, public.leave_requests, public.email_reminders,
              public.user_tokens, public.public_holidays from anon;

-- Server-only tables.
revoke all on public.email_reminders, public.user_tokens from authenticated;

-- PostgREST never needs these.
revoke truncate, references, trigger on public.profiles, public.leave_requests,
                                        public.public_holidays from authenticated;

-- Functions are executable by PUBLIC by default; narrow that.
revoke execute on function
  public.annual_allowance(),
  public.working_days(date, date),
  public.working_days_in_year(date, date, integer),
  public.approver_role_for(text, text),
  public.stage_approver_role(text, text, text),
  public.can_act_on(uuid, text),
  public.can_view_user(uuid),
  public.is_admin(),
  public.decide_leave_request(uuid, text, text, date, date),
  public.cancel_leave_request(uuid),
  public.approval_queue(),
  public.team_calendar(date, date),
  public.leave_balances(uuid[], integer),
  public.handle_new_user(),
  public.profiles_guard(),
  public.leave_requests_before_write()
from public, anon;

grant execute on function
  public.annual_allowance(),
  public.working_days(date, date),
  public.working_days_in_year(date, date, integer),
  public.approver_role_for(text, text),
  public.stage_approver_role(text, text, text),
  public.can_act_on(uuid, text),
  public.can_view_user(uuid),
  public.is_admin(),
  public.decide_leave_request(uuid, text, text, date, date),
  public.cancel_leave_request(uuid),
  public.approval_queue(),
  public.team_calendar(date, date),
  public.leave_balances(uuid[], integer)
to authenticated, service_role;
