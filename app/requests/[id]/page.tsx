'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import RequestDetailView, { type RequestDetail } from '@/components/requests/RequestDetailView';
import { createClient } from '@/lib/supabase/client';
import { errorMessage, todayStr } from '@/lib/leave';

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const [{ data: { user } }, { data }] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from('leave_requests')
          .select(`
            *,
            requester:profiles!leave_requests_requester_id_fkey(full_name, team, role),
            approver:profiles!leave_requests_approver_id_fkey(full_name),
            line_manager:profiles!leave_requests_line_manager_id_fkey(full_name)
          `)
          .eq('id', id)
          .maybeSingle(),
      ]);
      setUserId(user?.id ?? null);
      setRequest((data as unknown as RequestDetail) ?? null);
      setLoading(false);
    };
    load();
  }, [id]);

  const isOwner = !!request && request.requester_id === userId;
  const canCancel = isOwner && !!request
    && ['pending', 'pending_em_review', 'approved'].includes(request.status)
    && request.start_date > todayStr();

  const onCancel = async () => {
    const { error } = await createClient().rpc('cancel_leave_request', { p_request_id: id });
    if (error) return errorMessage(error);
    setRequest((r) => (r ? { ...r, status: 'cancelled', cancelled_at: new Date().toISOString() } : r));
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'cancelled', requestId: id }),
    }).catch(console.error);
    return null;
  };

  return <RequestDetailView request={request} loading={loading} isOwner={isOwner} canCancel={canCancel} onCancel={onCancel} />;
}
