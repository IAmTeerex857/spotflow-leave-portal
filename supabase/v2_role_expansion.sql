-- ============================================================
-- v2 Role Expansion & Feature Additions
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
--
-- What this script does:
--   1. Adds cover_person_email column to leave_requests
--   2. Adds leave_balance_adjustment column to profiles
--   3. Drops & recreates manager RLS policies to include:
--        - head_of_operations (approves operations + marketing)
--        - engineering_manager (now also approves qa_engineer)
--   4. Adds a calendar visibility policy (all authenticated users
--      can see approved + pending leaves for the team calendar)
--   5. Adds an admin policy so admins can update leave_balance_adjustment
-- ============================================================


-- ------------------------------------------------------------
-- STEP 1: New columns
-- ------------------------------------------------------------

-- Cover person email on leave requests (nullable, optional)
alter table public.leave_requests
  add column if not exists cover_person_email text;

-- Manual balance adjustment on profiles (admin-editable offset)
-- Positive = extra days granted, Negative = days deducted
-- Effective balance = max(0, 20 - used + leave_balance_adjustment)
alter table public.profiles
  add column if not exists leave_balance_adjustment integer not null default 0;


-- ------------------------------------------------------------
-- STEP 2: Drop old manager policies (will recreate below)
-- ------------------------------------------------------------

drop policy if exists "leave_requests: manager read team"  on public.leave_requests;
drop policy if exists "leave_requests: manager update team" on public.leave_requests;


-- ------------------------------------------------------------
-- STEP 3: Recreate manager SELECT policy
--   Includes all original roles + head_of_operations + qa_engineer
-- ------------------------------------------------------------

create policy "leave_requests: manager read team"
  on public.leave_requests for select
  using (
    exists (
      select 1
      from public.profiles manager
      join public.profiles requester on requester.id = leave_requests.requester_id
      where manager.id = auth.uid()
        and (
          -- backend line manager sees backend engineers
          (manager.role = 'backend_line_manager'
            and requester.team = 'backend'
            and requester.role in ('engineer', 'backend_engineer'))

          -- frontend line manager sees frontend engineers
          or (manager.role = 'frontend_line_manager'
            and requester.team = 'frontend'
            and requester.role in ('engineer', 'frontend_engineer'))

          -- engineering manager: all engineers (including qa) + line managers
          or (manager.role = 'engineering_manager'
            and requester.role in (
              'engineer', 'frontend_engineer', 'backend_engineer', 'qa_engineer',
              'frontend_line_manager', 'backend_line_manager', 'line_manager'
            ))

          -- head of product sees product designers and product managers
          or (manager.role = 'head_of_product'
            and requester.role in ('product_designer', 'product_manager'))

          -- head of operations sees operations and marketing
          or (manager.role = 'head_of_operations'
            and requester.role in ('operations', 'marketing'))

          -- legacy line_manager: same team
          or (manager.role = 'line_manager' and manager.team = requester.team)
        )
    )
  );


-- ------------------------------------------------------------
-- STEP 4: Recreate manager UPDATE policy (same scoping)
-- ------------------------------------------------------------

create policy "leave_requests: manager update team"
  on public.leave_requests for update
  using (
    exists (
      select 1
      from public.profiles manager
      join public.profiles requester on requester.id = leave_requests.requester_id
      where manager.id = auth.uid()
        and (
          (manager.role = 'backend_line_manager'
            and requester.team = 'backend'
            and requester.role in ('engineer', 'backend_engineer'))

          or (manager.role = 'frontend_line_manager'
            and requester.team = 'frontend'
            and requester.role in ('engineer', 'frontend_engineer'))

          or (manager.role = 'engineering_manager'
            and requester.role in (
              'engineer', 'frontend_engineer', 'backend_engineer', 'qa_engineer',
              'frontend_line_manager', 'backend_line_manager', 'line_manager'
            ))

          or (manager.role = 'head_of_product'
            and requester.role in ('product_designer', 'product_manager'))

          or (manager.role = 'head_of_operations'
            and requester.role in ('operations', 'marketing'))

          or (manager.role = 'line_manager' and manager.team = requester.team)
        )
    )
  );


-- ------------------------------------------------------------
-- STEP 5: Calendar visibility policy
--   All authenticated users can see approved + pending leaves.
--   This powers the team calendar so everyone can see who is out.
--   The existing self-select and manager policies still apply via OR.
-- ------------------------------------------------------------

drop policy if exists "leave_requests: calendar visibility" on public.leave_requests;

create policy "leave_requests: calendar visibility"
  on public.leave_requests for select
  to authenticated
  using (status in ('approved', 'pending'));


-- ------------------------------------------------------------
-- STEP 6: Allow admins to update leave_balance_adjustment
--   Admins already have a broad update policy on profiles for role
--   management. This ensures that column is covered even if the
--   existing policy is column-specific.
-- ------------------------------------------------------------

drop policy if exists "profiles: admin can update any profile" on public.profiles;

create policy "profiles: admin can update any profile"
  on public.profiles for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );


-- ------------------------------------------------------------
-- Done. Summary of changes:
--   leave_requests.cover_person_email    — new nullable text column
--   profiles.leave_balance_adjustment    — new integer column (default 0)
--   RLS manager read/update             — now includes head_of_operations,
--                                         qa_engineer under engineering_manager
--   RLS calendar visibility             — all auth users see approved/pending
--   RLS admin profile update            — confirmed/recreated for balance edits
-- ------------------------------------------------------------
