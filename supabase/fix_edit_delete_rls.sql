-- ============================================================
-- Fix: Allow users to update their own PENDING leave requests
-- Run this in Supabase SQL Editor
-- ============================================================

-- Users can edit their own requests only while they are still pending
create policy "leave_requests: own update pending"
  on public.leave_requests for update
  using (auth.uid() = requester_id and status = 'pending')
  with check (auth.uid() = requester_id);

-- Also allow users to delete their own requests
create policy "leave_requests: own delete"
  on public.leave_requests for delete
  using (auth.uid() = requester_id);
