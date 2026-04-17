-- ============================================================
-- Fix: Clean up all RLS policies on leave_requests
-- Drops old + new overlapping policies and creates one
-- definitive set that covers all roles correctly.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- ── Drop ALL existing leave_requests policies ────────────────
drop policy if exists "leave_requests: own read"               on public.leave_requests;
drop policy if exists "leave_requests: own insert"             on public.leave_requests;
drop policy if exists "leave_requests: own update pending"     on public.leave_requests;
drop policy if exists "leave_requests: own delete"             on public.leave_requests;
drop policy if exists "leave_requests: manager read"           on public.leave_requests;
drop policy if exists "leave_requests: manager update"         on public.leave_requests;
drop policy if exists "leave_requests: manager read team"      on public.leave_requests;
drop policy if exists "leave_requests: manager update team"    on public.leave_requests;
drop policy if exists "leave_requests: eng manager read"       on public.leave_requests;
drop policy if exists "leave_requests: eng manager update"     on public.leave_requests;
drop policy if exists "leave_requests: head of product read"   on public.leave_requests;
drop policy if exists "leave_requests: head of product update" on public.leave_requests;

-- ── 1. Users: read their own requests ───────────────────────
create policy "leave_requests: own read"
  on public.leave_requests for select
  using (auth.uid() = requester_id);

-- ── 2. Users: submit new requests ───────────────────────────
create policy "leave_requests: own insert"
  on public.leave_requests for insert
  with check (auth.uid() = requester_id);

-- ── 3. Users: edit their own PENDING requests ────────────────
create policy "leave_requests: own update pending"
  on public.leave_requests for update
  using (auth.uid() = requester_id and status = 'pending')
  with check (auth.uid() = requester_id);

-- ── 4. Users: delete their own requests ─────────────────────
create policy "leave_requests: own delete"
  on public.leave_requests for delete
  using (auth.uid() = requester_id);

-- ── 5. Managers: read requests from their team ──────────────
create policy "leave_requests: manager read"
  on public.leave_requests for select
  using (
    exists (
      select 1
      from public.profiles AS manager
      join public.profiles AS requester on requester.id = leave_requests.requester_id
      where manager.id = auth.uid()
        and (
          -- Frontend line manager → frontend engineers
          (manager.role = 'frontend_line_manager'
            and requester.team = 'frontend'
            and requester.role in ('engineer', 'frontend_engineer'))

          -- Backend line manager → backend engineers
          or (manager.role = 'backend_line_manager'
            and requester.team = 'backend'
            and requester.role in ('engineer', 'backend_engineer'))

          -- Engineering manager → all engineers + line managers
          or (manager.role = 'engineering_manager'
            and requester.role in (
              'engineer', 'frontend_engineer', 'backend_engineer',
              'frontend_line_manager', 'backend_line_manager', 'line_manager'
            ))

          -- Head of product → product designers + product managers
          -- Also catches engineers on the product/design team (before role is assigned)
          or (manager.role = 'head_of_product'
            and (
              requester.role in ('product_designer', 'product_manager')
              or requester.team in ('product', 'design')
            ))

          -- Legacy line manager → same team
          or (manager.role = 'line_manager'
            and manager.team = requester.team)
        )
    )
  );

-- ── 6. Managers: approve/reject requests ────────────────────
create policy "leave_requests: manager update"
  on public.leave_requests for update
  using (
    exists (
      select 1
      from public.profiles AS manager
      join public.profiles AS requester on requester.id = leave_requests.requester_id
      where manager.id = auth.uid()
        and (
          (manager.role = 'frontend_line_manager'
            and requester.team = 'frontend'
            and requester.role in ('engineer', 'frontend_engineer'))

          or (manager.role = 'backend_line_manager'
            and requester.team = 'backend'
            and requester.role in ('engineer', 'backend_engineer'))

          or (manager.role = 'engineering_manager'
            and requester.role in (
              'engineer', 'frontend_engineer', 'backend_engineer',
              'frontend_line_manager', 'backend_line_manager', 'line_manager'
            ))

          or (manager.role = 'head_of_product'
            and (
              requester.role in ('product_designer', 'product_manager')
              or requester.team in ('product', 'design')
            ))

          or (manager.role = 'line_manager'
            and manager.team = requester.team)
        )
    )
  );
