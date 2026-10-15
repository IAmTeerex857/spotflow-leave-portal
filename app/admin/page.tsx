'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import AdminView, { type AdminProfile } from '@/components/admin/AdminView';
import { createClient } from '@/lib/supabase/client';
import { getLeaveBalances, type LeaveBalance } from '@/lib/leave-balance';
import { errorMessage } from '@/lib/leave';

export default function AdminPage() {
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const balancesLoaded = useRef(false);

  useEffect(() => {
    createClient()
      .from('profiles')
      .select('id, full_name, email, team, role, is_admin')
      .order('full_name')
      .then(({ data }) => {
        setProfiles((data ?? []) as AdminProfile[]);
        setLoadingProfiles(false);
      });
  }, []);

  const onLoadBalances = useCallback(async () => {
    if (balancesLoaded.current) return;
    balancesLoaded.current = true;
    setLoadingBalances(true);
    setBalances(await getLeaveBalances().catch(() => []));
    setLoadingBalances(false);
  }, []);

  // Updates go through RLS; .select() confirms a row actually changed.
  const onSaveRole = async (id: string, role: string) => {
    const { data, error } = await createClient().from('profiles').update({ role }).eq('id', id).select('id');
    if (error) return errorMessage(error);
    if (!data?.length) return 'Not saved — you may no longer be an admin.';
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, role } : p)));
    setBalances((prev) => prev.map((b) => (b.user_id === id ? { ...b, role } : b)));
    return null;
  };

  const onSaveAdjustment = async (id: string, adjustment: number) => {
    const { data, error } = await createClient().from('profiles').update({ leave_balance_adjustment: adjustment }).eq('id', id).select('id');
    if (error) return errorMessage(error);
    if (!data?.length) return 'Not saved — you may no longer be an admin.';
    setBalances((prev) => prev.map((b) => {
      if (b.user_id !== id) return b;
      const allowance = b.allowance - b.adjustment + adjustment;
      return { ...b, adjustment, allowance, remaining: Math.max(0, allowance - b.used) };
    }));
    return null;
  };

  return (
    <AdminView
      profiles={profiles}
      loadingProfiles={loadingProfiles}
      balances={balances}
      loadingBalances={loadingBalances}
      onLoadBalances={onLoadBalances}
      onSaveRole={onSaveRole}
      onSaveAdjustment={onSaveAdjustment}
    />
  );
}
