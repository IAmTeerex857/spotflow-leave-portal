'use client';
import AppShell from '@/components/layout/AppShell';
import StatusBadge from '@/components/ui/StatusBadge';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays, User, Clock, CheckCircle, XCircle, FileText, AlignLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useParams } from 'next/navigation';

const leaveTypeLabel: Record<string, string> = {
  annual: 'Annual Leave', sick: 'Sick Leave', personal: 'Personal', other: 'Other',
};

interface RequestDetail {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  reason: string;
  cover_notes: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  actioned_at: string | null;
  approver_comment: string | null;
  requester: { full_name: string; team: string };
  approver: { full_name: string } | null;
}

function DetailRow({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: '12px', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-muted)', marginTop: '1px', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{label}</p>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{value}</div>
      </div>
    </div>
  );
}

export default function RequestDetailPage() {
  const { id } = useParams();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('leave_requests')
        .select(`
          *,
          requester:profiles!leave_requests_requester_id_fkey(full_name, team),
          approver:profiles!leave_requests_approver_id_fkey(full_name)
        `)
        .eq('id', id as string)
        .single();

      if (data) setRequest(data as unknown as RequestDetail);
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) return <AppShell><div className="page-content" style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading…</div></AppShell>;
  if (!request) return <AppShell><div className="page-content" style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Request not found.</div></AppShell>;

  const r = request;

  return (
    <AppShell>
      <header className="topbar">
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Request Detail</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>ID: {r.id.slice(0, 8)}…</p>
        </div>
        <StatusBadge status={r.status} />
      </header>

      <div className="page-content fade-in" style={{ maxWidth: '680px' }}>
        <div className="glass-card" style={{ padding: '24px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {leaveTypeLabel[r.leave_type]}
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Submitted {format(new Date(r.created_at), 'dd MMM yyyy, HH:mm')}
          </p>
          <div style={{ marginTop: '8px' }}>
            <DetailRow icon={<CalendarDays size={15} />} label="Dates" value={`${format(new Date(r.start_date), 'dd MMM yyyy')} — ${format(new Date(r.end_date), 'dd MMM yyyy')}`} />
            <DetailRow icon={<Clock size={15} />} label="Duration" value={`${r.duration_days} working day${r.duration_days !== 1 ? 's' : ''}`} />
            <DetailRow icon={<User size={15} />} label="Requester" value={`${r.requester.full_name} · ${r.requester.team}`} />
            <DetailRow icon={<AlignLeft size={15} />} label="Reason" value={r.reason} />
            {r.cover_notes && <DetailRow icon={<FileText size={15} />} label="Cover arrangements" value={r.cover_notes} />}
          </div>
        </div>

        {/* Timeline */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>Timeline</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[
              { icon: <FileText size={14} />, label: 'Request submitted', time: format(new Date(r.created_at), 'dd MMM yyyy, HH:mm'), color: 'var(--text-secondary)' },
              r.actioned_at
                ? {
                    icon: r.status === 'approved' ? <CheckCircle size={14} /> : <XCircle size={14} />,
                    label: r.status === 'approved' ? `Approved${r.approver ? ` by ${r.approver.full_name}` : ''}` : `Rejected${r.approver ? ` by ${r.approver.full_name}` : ''}`,
                    time: format(new Date(r.actioned_at), 'dd MMM yyyy, HH:mm'),
                    color: r.status === 'approved' ? 'var(--success)' : 'var(--danger)',
                    comment: r.approver_comment,
                  }
                : { icon: <Clock size={14} />, label: 'Awaiting manager review', time: 'Pending', color: 'var(--pending)', comment: null },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingBottom: i === 0 ? '16px' : '0', position: 'relative' }}>
                {i === 0 && <div style={{ position: 'absolute', left: '11px', top: '22px', bottom: '-4px', width: '1px', background: 'var(--border)' }} />}
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>{item.label}</p>
                  {'comment' in item && item.comment && (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontStyle: 'italic' }}>"{item.comment}"</p>
                  )}
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
