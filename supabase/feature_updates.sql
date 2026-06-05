-- ============================================================
-- Feature updates: EM vetting workflow + Google Calendar sync
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add pending_em_review to leave_requests status enum
--    (drop the old constraint, re-add with new value)
ALTER TABLE public.leave_requests
  DROP CONSTRAINT IF EXISTS leave_requests_status_check;

ALTER TABLE public.leave_requests
  ADD CONSTRAINT leave_requests_status_check
  CHECK (status IN ('pending', 'pending_em_review', 'approved', 'rejected', 'cancelled'));

-- 2. user_tokens — stores Google OAuth refresh tokens for calendar sync
--    One row per user per provider (upserted on every login once calendar
--    scope is enabled in Supabase Auth > Providers > Google).
CREATE TABLE IF NOT EXISTS public.user_tokens (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider      text        NOT NULL DEFAULT 'google',
  refresh_token text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

ALTER TABLE public.user_tokens ENABLE ROW LEVEL SECURITY;

-- Only server-side service role can read/write tokens — never the browser
CREATE POLICY "user_tokens: service role only"
  ON public.user_tokens
  USING (auth.role() = 'service_role');

-- ============================================================
-- MANUAL STEP REQUIRED IN SUPABASE DASHBOARD
-- Auth > Providers > Google > Additional Scopes:
--   https://www.googleapis.com/auth/calendar.events
-- Also add query params:
--   access_type=offline&prompt=consent
-- This ensures a refresh_token is returned on every login.
-- ============================================================
