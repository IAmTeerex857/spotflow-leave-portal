-- ============================================================
-- Fix: Update schema constraints for new teams and roles
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── 1. Update team constraint (add 'design') ─────────────────
alter table public.profiles
  drop constraint if exists profiles_team_check;

alter table public.profiles
  add constraint profiles_team_check
  check (team in ('backend', 'frontend', 'product', 'design'));

-- ── 2. Update role constraint (all new roles) ─────────────────
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in (
    'engineer',
    'frontend_engineer',
    'backend_engineer',
    'product_designer',
    'product_manager',
    'frontend_line_manager',
    'backend_line_manager',
    'line_manager',
    'engineering_manager',
    'head_of_product'
  ));
