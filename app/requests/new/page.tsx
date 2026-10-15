'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import NewRequestView, { type NewRequestValues } from '@/components/requests/NewRequestView';
import type { Colleague } from '@/components/ui/ColleaguePicker';
import { createClient } from '@/lib/supabase/client';
import { getLeaveBalance, type LeaveBalance } from '@/lib/leave-balance';
import { errorMessage } from '@/lib/leave';

export default function NewRequestPage() {
  const router = useRouter();
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [booked, setBooked] = useState<{ start_date: string; end_date: string }[]>([]);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [bal, { data: people }, { data: mine }] = await Promise.all([
        getLeaveBalance(user.id).catch(() => null),
        supabase.from('profiles').select('id, full_name, email, team').neq('id', user.id).neq('team', 'pending').order('full_name'),
        supabase.from('leave_requests').select('start_date, end_date').eq('requester_id', user.id).in('status', ['pending', 'pending_em_review', 'approved']),
      ]);
      setBalance(bal);
      setColleagues((people ?? []) as Colleague[]);
      setBooked(mine ?? []);
    };
    load();
  }, []);

  const onSubmit = async (v: NewRequestValues) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'You’re signed out. Sign in again and retry.';

    // The database sets status and duration, and enforces the allowance.
    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        requester_id: user.id,
        leave_type: v.leave_type,
        start_date: v.start_date,
        end_date: v.end_date,
        reason: v.reason.trim(),
        cover_notes: v.cover_notes.trim() || null,
        cover_person_email: v.cover_person_email.trim() || null,
      })
      .select('id')
      .single();
    if (error || !data) return errorMessage(error);

    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'submitted', requestId: data.id }),
    }).catch(console.error);

    router.push(`/requests/${data.id}`);
    return null;
  };

  return <NewRequestView balance={balance} colleagues={colleagues} booked={booked} onSubmit={onSubmit} />;
}
