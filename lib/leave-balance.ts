/**
 * Leave balance calculation utilities.
 * 20 days per calendar year (Jan–Dec).
 * Only approved leaves count toward the total.
 */

import { createClient } from '@/lib/supabase/client';

export const ANNUAL_ALLOWANCE = 20;

export interface LeaveBalance {
  used: number;       // approved days this calendar year
  pending: number;    // pending days (not yet deducted)
  remaining: number;  // allowance - used
  allowance: number;  // always 20
}

export async function getLeaveBalance(userId: string): Promise<LeaveBalance> {
  const supabase = createClient();
  const year = new Date().getFullYear();
  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;

  const [{ data: approved }, { data: pending }] = await Promise.all([
    supabase
      .from('leave_requests')
      .select('duration_days')
      .eq('requester_id', userId)
      .eq('status', 'approved')
      .gte('start_date', startOfYear)
      .lte('start_date', endOfYear),
    supabase
      .from('leave_requests')
      .select('duration_days')
      .eq('requester_id', userId)
      .eq('status', 'pending')
      .gte('start_date', startOfYear)
      .lte('start_date', endOfYear),
  ]);

  const used = approved?.reduce((sum, r) => sum + (r.duration_days ?? 0), 0) ?? 0;
  const pendingDays = pending?.reduce((sum, r) => sum + (r.duration_days ?? 0), 0) ?? 0;

  return {
    used,
    pending: pendingDays,
    remaining: Math.max(0, ANNUAL_ALLOWANCE - used),
    allowance: ANNUAL_ALLOWANCE,
  };
}

/** Fetch balance for all profiles — for admin view */
export async function getAllLeaveBalances() {
  const supabase = createClient();
  const year = new Date().getFullYear();
  const startOfYear = `${year}-01-01`;
  const endOfYear = `${year}-12-31`;

  const [{ data: profiles }, { data: leaves }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, team, role'),
    supabase
      .from('leave_requests')
      .select('requester_id, duration_days, status')
      .in('status', ['approved', 'pending'])
      .gte('start_date', startOfYear)
      .lte('start_date', endOfYear),
  ]);

  if (!profiles) return [];

  return profiles.map((p) => {
    const userLeaves = leaves?.filter((l) => l.requester_id === p.id) ?? [];
    const used = userLeaves
      .filter((l) => l.status === 'approved')
      .reduce((sum, l) => sum + (l.duration_days ?? 0), 0);
    const pending = userLeaves
      .filter((l) => l.status === 'pending')
      .reduce((sum, l) => sum + (l.duration_days ?? 0), 0);
    return {
      ...p,
      used,
      pending,
      remaining: Math.max(0, ANNUAL_ALLOWANCE - used),
    };
  });
}
