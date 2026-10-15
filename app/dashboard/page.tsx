'use client';
import { useEffect, useState } from 'react';
import DashboardView, { type LeaveEdit, type LeaveRequest } from '@/components/dashboard/DashboardView';
import { createClient } from '@/lib/supabase/client';
import { getLeaveBalance, type LeaveBalance } from '@/lib/leave-balance';
import { errorMessage } from '@/lib/leave';

function notify(event: 'submitted' | 'cancelled', requestId: string) {
  fetch('/api/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, requestId }),
  }).catch(console.error);
}

export default function DashboardPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const refreshBalance = async (uid: string) => setBalance(await getLeaveBalance(uid));

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setUserId(user.id);

        const [{ data: profile }, { data: leaves }] = await Promise.all([
          supabase.from('profiles').select('full_name').eq('id', user.id).single(),
          supabase.from('leave_requests').select('*').eq('requester_id', user.id).order('created_at', { ascending: false }),
        ]);
        if (profile) setFirstName(profile.full_name.split(' ')[0]);
        if (leaves) setRequests(leaves as LeaveRequest[]);
        await refreshBalance(user.id);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onSaveEdit = async (id: string, changes: LeaveEdit) => {
    // The database recomputes duration and resets the request to pending.
    const { data, error } = await createClient()
      .from('leave_requests')
      .update(changes)
      .eq('id', id)
      .select('*')
      .single();
    if (error || !data) return errorMessage(error);
    setRequests((prev) => prev.map((r) => (r.id === id ? (data as LeaveRequest) : r)));
    if (userId) await refreshBalance(userId);
    notify('submitted', id);
    return null;
  };

  const onDelete = async (id: string) => {
    // RLS silently skips rows it won't delete, so confirm one was removed.
    const { data, error } = await createClient().from('leave_requests').delete().eq('id', id).select('id');
    if (error) return errorMessage(error);
    if (!data?.length) return 'Only pending or rejected requests can be deleted.';
    setRequests((prev) => prev.filter((r) => r.id !== id));
    if (userId) await refreshBalance(userId);
    return null;
  };

  const onCancel = async (id: string) => {
    const { error } = await createClient().rpc('cancel_leave_request', { p_request_id: id });
    if (error) return errorMessage(error);
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r)));
    notify('cancelled', id);
    if (userId) await refreshBalance(userId);
    return null;
  };

  return (
    <DashboardView
      loading={loading}
      firstName={firstName}
      balance={balance}
      requests={requests}
      onSaveEdit={onSaveEdit}
      onDelete={onDelete}
      onCancel={onCancel}
    />
  );
}
