'use client';
import { useEffect, useState } from 'react';
import QueueView, { type Decide, type QueueRequest } from '@/components/manager/QueueView';
import { createClient } from '@/lib/supabase/client';
import { getLeaveBalances, type LeaveBalance } from '@/lib/leave-balance';
import { errorMessage } from '@/lib/leave';

export default function ManagerQueuePage() {
  const [requests, setRequests] = useState<QueueRequest[]>([]);
  const [balances, setBalances] = useState<Record<string, LeaveBalance>>({});
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setRole(profile?.role ?? '');

        // The database decides what this user may act on (same rules as RLS).
        const { data, error } = await supabase.rpc('approval_queue');
        if (error) throw error;
        const queue = (data ?? []) as QueueRequest[];
        setRequests(queue);

        const ids = [...new Set(queue.map((r) => r.requester_id))];
        if (ids.length) {
          const rows = await getLeaveBalances(ids);
          setBalances(Object.fromEntries(rows.map((b) => [b.user_id, b])));
        }
      } catch (err) {
        setLoadError(errorMessage(err, 'Could not load the queue.'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const onDecide: Decide = async (id, decision, opts = {}) => {
    const { data, error } = await createClient().rpc('decide_leave_request', {
      p_request_id: id,
      p_decision: decision,
      p_comment: opts.comment ?? null,
      p_start_date: opts.startDate ?? null,
      p_end_date: opts.endDate ?? null,
    });
    if (error) return errorMessage(error);

    // Only notify about the status the database actually recorded.
    const status = (data as { status: string }).status;
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: status === 'pending_em_review' ? 'em_review' : status, requestId: id }),
    }).catch(console.error);

    setRequests((prev) => prev.filter((r) => r.id !== id));
    return null;
  };

  return <QueueView loading={loading} loadError={loadError} role={role} requests={requests} balances={balances} onDecide={onDecide} />;
}
