/**
 * Leave balances are computed by the database (public.leave_balances):
 * 20 days per calendar year plus any admin adjustment. Every leave type
 * counts, and leave spanning two years is split across them.
 */

import { createClient } from '@/lib/supabase/client';

export interface LeaveBalance {
  user_id: string;
  full_name: string;
  team: string;
  role: string;
  allowance: number;   // 20 + adjustment
  adjustment: number;  // admin-set offset (positive = extra days)
  used: number;        // approved days this year
  pending: number;     // days awaiting approval this year
  remaining: number;   // allowance - used
}

/** Balances for the given users (or everyone the caller may see when omitted). */
export async function getLeaveBalances(userIds?: string[], year?: number): Promise<LeaveBalance[]> {
  const { data, error } = await createClient().rpc('leave_balances', {
    p_user_ids: userIds ?? null,
    p_year: year ?? null,
  });
  if (error) throw error;
  return (data ?? []) as LeaveBalance[];
}

export async function getLeaveBalance(userId: string): Promise<LeaveBalance | null> {
  const [balance] = await getLeaveBalances([userId]);
  return balance ?? null;
}
