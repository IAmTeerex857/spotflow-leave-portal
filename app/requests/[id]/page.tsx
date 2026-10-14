'use client';
import AppShell from '@/components/layout/AppShell';
import StatusBadge from '@/components/ui/StatusBadge';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { CalendarDays, User, Clock, CheckCircle, XCircle, FileText, AlignLeft, MapPin, Thermometer, Users, ChevronLeft, AlertTriangle, ShieldCheck, Ban } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { formatDate, leaveTypeLabel, type LeaveStatus } from '@/lib/leave';
const leaveTypeIcon: Record<string, React.ReactNode> = {
  annual: <MapPin size={18} strokeWidth={1.5} />,
  sick: <Thermometer size={18} strokeWidth={1.5} />,
  personal: <User size={18} strokeWidth={1.5} />,
  other: <FileText size={18} strokeWidth={1.5} />,
};

interface RequestDetail {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  reason: string;
  cover_notes: string | null;
  status: LeaveStatus;
  created_at: string;
  actioned_at: string | null;
  line_manager_actioned_at: string | null;
  cancelled_at: string | null;
  approver_comment: string | null;
  requester: { full_name: string; team: string; role: string };
  approver: { full_name: string } | null;
  line_manager: { full_name: string } | null;
}

interface TimelineItem {
  icon: React.ReactNode;
  label: string;
  time: string;
  color: string;
  comment?: string | null;
}

const stamp = (ts: string) => format(new Date(ts), 'dd MMM yyyy, HH:mm');

/** Every stage the request has been through, plus what it's waiting on. */
function buildTimeline(r: RequestDetail): TimelineItem[] {
  const items: TimelineItem[] = [
    { icon: <FileText size={13} />, label: 'Submitted', time: stamp(r.created_at), color: '#6366F1' },
  ];

  if (r.line_manager_actioned_at) {
    items.push({
      icon: <CheckCircle size={13} />,
      label: `Approved by ${r.line_manager?.full_name ?? 'line manager'}`,
      time: stamp(r.line_manager_actioned_at),
      color: '#A78BFA',
      comment: r.status === 'pending_em_review' ? r.approver_comment : null,
    });
  }

  const by = r.approver ? ` by ${r.approver.full_name}` : '';
  const decided = r.actioned_at && r.status !== 'pending_em_review';

  if (r.status === 'pending') {
    items.push({ icon: <Clock size={13} />, label: 'Awaiting approval', time: 'Pending manager review', color: '#F59E0B' });
  } else if (r.status === 'pending_em_review') {
    items.push({ icon: <ShieldCheck size={13} />, label: 'Awaiting Engineering Manager', time: 'Pending confirmation', color: '#A78BFA' });
  } else if (r.status === 'approved' && decided) {
    items.push({ icon: <CheckCircle size={13} />, label: `Approved${by}`, time: stamp(r.actioned_at!), color: '#22C55E', comment: r.approver_comment });
  } else if (r.status === 'rejected' && decided) {
    const override = r.line_manager_actioned_at ? 'Overridden' : 'Rejected';
    items.push({ icon: <XCircle size={13} />, label: `${override}${by}`, time: stamp(r.actioned_at!), color: '#EF4444', comment: r.approver_comment });
  }

  if (r.status === 'cancelled') {
    if (r.actioned_at && r.approver) {
      items.push({ icon: <CheckCircle size={13} />, label: `Approved${by}`, time: stamp(r.actioned_at), color: '#22C55E' });
    }
    items.push({ icon: <Ban size={13} />, label: 'Cancelled', time: r.cancelled_at ? stamp(r.cancelled_at) : '', color: '#71717A' });
  }

  return items;
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
  const router = useRouter();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('leave_requests')
        .select(`
          *,
          requester:profiles!leave_requests_requester_id_fkey(full_name, team, role),
          approver:profiles!leave_requests_approver_id_fkey(full_name),
          line_manager:profiles!leave_requests_line_manager_id_fkey(full_name)
        `)
        .eq('id', id as string)
        .single();

      if (error || !data) setNotFound(true);
      else setRequest(data as unknown as RequestDetail);
      setLoading(false);
    };
    fetch();
  }, [id]);

  if (loading) return (
    <AppShell>
      <div className="page-content" style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading…</div>
    </AppShell>
  );

  if (notFound || !request) return (
    <AppShell>
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '80px', gap: '12px' }}>
        <AlertTriangle size={32} style={{ color: 'var(--text-muted)' }} />
        <p style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600 }}>Request not found</p>
        <button className="btn btn-ghost" onClick={() => router.push('/dashboard')}>Back to dashboard</button>
      </div>
    </AppShell>
  );

  const r = request;
  const isApproved = r.status === 'approved';
  const isRejected = r.status === 'rejected';

  return (
    <AppShell>
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => router.back()}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}
          >
            <ChevronLeft size={14} /> Back
          </button>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Leave Request</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>
              Submitted {format(new Date(r.created_at), 'dd MMM yyyy, HH:mm')}
            </p>
          </div>
        </div>
        <StatusBadge status={r.status} />
      </header>

      <div className="page-content fade-in">
        <div className="detail-grid">

          {/* ── Main details card ── */}
          <div className="glass-card" style={{ padding: '0 24px' }}>
            {/* Type header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '11px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}>
                {leaveTypeIcon[r.leave_type] ?? <FileText size={18} strokeWidth={1.5} />}
              </div>
              <div>
                <p style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>{leaveTypeLabel(r.leave_type)}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {formatDate(r.start_date, 'dd MMM')} – {formatDate(r.end_date, 'dd MMM yyyy')}
                  &nbsp;·&nbsp;<strong style={{ color: 'var(--text-secondary)' }}>{r.duration_days} day{r.duration_days !== 1 ? 's' : ''}</strong>
                </p>
              </div>
            </div>

            <DetailRow icon={<CalendarDays size={15} />} label="Dates"
              value={`${formatDate(r.start_date, 'EEEE, dd MMMM yyyy')} → ${formatDate(r.end_date, 'EEEE, dd MMMM yyyy')}`} />
            <DetailRow icon={<Clock size={15} />} label="Duration"
              value={`${r.duration_days} working day${r.duration_days !== 1 ? 's' : ''} (weekends & public holidays excluded)`} />
            <DetailRow icon={<User size={15} />} label="Requested by"
              value={
                <span>{r.requester.full_name}
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px', textTransform: 'capitalize' }}>
                    {r.requester.team} · {r.requester.role?.replace(/_/g, ' ')}
                  </span>
                </span>
              } />
            <DetailRow icon={<AlignLeft size={15} />} label="Reason"
              value={<span style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>&ldquo;{r.reason}&rdquo;</span>} />
            {r.cover_notes && (
              <DetailRow icon={<Users size={15} />} label="Cover arrangements" value={r.cover_notes} />
            )}
            {(isApproved || isRejected) && r.approver && (
              <DetailRow
                icon={isApproved ? <CheckCircle size={15} style={{ color: '#22C55E' }} /> : <XCircle size={15} style={{ color: '#EF4444' }} />}
                label={isApproved ? 'Approved by' : 'Rejected by'}
                value={
                  <span>{r.approver.full_name}
                    {r.actioned_at && <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>on {format(new Date(r.actioned_at), 'dd MMM yyyy')}</span>}
                  </span>
                }
              />
            )}
            {isRejected && r.approver_comment && (
              <DetailRow icon={<FileText size={15} />} label="Rejection reason"
                value={
                  <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '8px', padding: '10px 12px' }}>
                    <p style={{ fontSize: '13px', color: '#FCA5A5', fontStyle: 'italic' }}>&ldquo;{r.approver_comment}&rdquo;</p>
                  </div>
                }
              />
            )}
            <div style={{ height: '6px' }} />
          </div>

          {/* ── Timeline sidebar ── */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '16px' }}>Timeline</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {buildTimeline(r).map((item, i, arr) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', paddingBottom: i < arr.length - 1 ? '16px' : '0', position: 'relative' }}>
                  {i < arr.length - 1 && <div style={{ position: 'absolute', left: '11px', top: '22px', bottom: '0', width: '1px', background: 'var(--border)' }} />}
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: `${item.color}18`, border: `1px solid ${item.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color, flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{item.label}</p>
                    {item.comment && (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>&ldquo;{item.comment}&rdquo;</p>
                    )}
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
