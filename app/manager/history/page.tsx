'use client';
import { useEffect, useState } from 'react';
import HistoryView, { type HistoryRequest } from '@/components/manager/HistoryView';
import { createClient } from '@/lib/supabase/client';

export default function ManagerHistoryPage() {
  const [requests, setRequests] = useState<HistoryRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      // RLS limits this to people the manager approves for; drop their own.
      const { data } = await supabase
        .from('leave_requests')
        .select('id, requester_id, leave_type, start_date, end_date, duration_days, status, created_at, requester:profiles!leave_requests_requester_id_fkey(full_name, team)')
        .order('created_at', { ascending: false });
      if (data) {
        setRequests(
          (data as unknown as (HistoryRequest & { requester_id: string })[]).filter((r) => r.requester_id !== user?.id),
        );
      }
      setLoading(false);
    };
    load();
  }, []);

  return <HistoryView loading={loading} requests={requests} />;
}
