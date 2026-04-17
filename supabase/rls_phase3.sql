-- ============================================================
-- Phase 3: RLS policy updates for new roles
-- Run this in Supabase SQL Editor
-- ============================================================

-- Update the profile trigger to default role to 'engineer' (role assigned by admin later)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, team, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Unknown'),
    new.email,
    coalesce(new.raw_user_meta_data->>'team', 'backend'),
    'engineer'  -- everyone starts as engineer; admin assigns specific role
  );
  return new;
end;
$$;

-- Drop old manager policies (we'll recreate with broader scope)
drop policy if exists "leave_requests: manager read team" on public.leave_requests;
drop policy if exists "leave_requests: manager update team" on public.leave_requests;

-- New manager read policy — covers all manager roles with new role names
create policy "leave_requests: manager read team"
  on public.leave_requests for select
  using (
    exists (
      select 1 from public.profiles manager
      join public.profiles requester on requester.id = leave_requests.requester_id
      where manager.id = auth.uid()
        and (
          -- backend line manager sees backend engineers
          (manager.role = 'backend_line_manager' and requester.team = 'backend'
            and requester.role in ('engineer', 'backend_engineer'))
          -- frontend line manager sees frontend engineers
          or (manager.role = 'frontend_line_manager' and requester.team = 'frontend'
            and requester.role in ('engineer', 'frontend_engineer'))
          -- engineering manager sees all engineers + line managers
          or (manager.role = 'engineering_manager'
            and requester.role in ('engineer', 'frontend_engineer', 'backend_engineer',
                                   'frontend_line_manager', 'backend_line_manager', 'line_manager'))
          -- head of product sees product designers and product managers
          or (manager.role = 'head_of_product'
            and requester.role in ('product_designer', 'product_manager'))
          -- legacy line_manager: same team
          or (manager.role = 'line_manager' and manager.team = requester.team)
        )
    )
  );

-- New manager update policy (same scoping)
create policy "leave_requests: manager update team"
  on public.leave_requests for update
  using (
    exists (
      select 1 from public.profiles manager
      join public.profiles requester on requester.id = leave_requests.requester_id
      where manager.id = auth.uid()
        and (
          (manager.role = 'backend_line_manager' and requester.team = 'backend'
            and requester.role in ('engineer', 'backend_engineer'))
          or (manager.role = 'frontend_line_manager' and requester.team = 'frontend'
            and requester.role in ('engineer', 'frontend_engineer'))
          or (manager.role = 'engineering_manager'
            and requester.role in ('engineer', 'frontend_engineer', 'backend_engineer',
                                   'frontend_line_manager', 'backend_line_manager', 'line_manager'))
          or (manager.role = 'head_of_product'
            and requester.role in ('product_designer', 'product_manager'))
          or (manager.role = 'line_manager' and manager.team = requester.team)
        )
    )
  );

