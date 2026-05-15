-- v3 Role Constraint Fix
-- The role CHECK constraint was never updated when new roles were added in v2.
-- Saves to qa_engineer / operations / marketing / head_of_operations silently
-- failed the constraint and Supabase kept the old value. This migration
-- drops the old constraint and adds a new one with all valid roles.
-- Also widens the team constraint to include 'operations' and 'marketing'.
--
-- Run this in the Supabase SQL Editor.

-- 1. Drop the old role constraint
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Add updated role constraint with all valid roles
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN (
    'engineer',
    'frontend_engineer',
    'backend_engineer',
    'qa_engineer',
    'operations',
    'marketing',
    'product_designer',
    'product_manager',
    'frontend_line_manager',
    'backend_line_manager',
    'engineering_manager',
    'head_of_product',
    'head_of_operations',
    'line_manager'
  ));

-- 3. Drop the old team constraint
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_team_check;

-- 4. Add updated team constraint
ALTER TABLE profiles
  ADD CONSTRAINT profiles_team_check CHECK (team IN (
    'backend',
    'frontend',
    'product',
    'operations',
    'marketing'
  ));
