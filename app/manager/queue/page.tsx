'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';
import { CheckCircle, XCircle, CalendarDays, User, Clock, Gauge } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ANNUAL_ALLOWANCE } from '@/lib/leave-balance';

const leaveTypeLabel: Record<string, string> = {
  annual: 'Annual Leave', sick: 'Sick Leave', personal: 'Personal', other: 'Other',
};

interface Request {
  id: string;
  requester_id: string;
  requester: { full_name: string; team: string; role: string };
  leave_type: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
}

function RejectModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card scale-in" onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Reject request</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
          Please provide a reason. This will be sent to the team member by email.
        </p>
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label" htmlFor="reject-reason">Rejection reason <span style={{ color: 'var(--danger)' }}>*</span></label>
          <textarea id="reject-reason" className="form-input" placeholder="e.g. Insufficient cover during critical sprint…" value={reason} onChange={e => setReason(e.target.value)} style={{ minHeight: '100px' }} />
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button id="confirm-reject" className="btn btn-danger" disabled={!reason.trim()} style={{ opacity: reason.trim() ? 1 : 0.5 }} onClick={() => onSubmit(reason)}>
            <XCircle size={14} /> Confirm rejection
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ManagerQueuePage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [balances, setBalances] = useState<Record<string, number>>({});

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // RLS handles scoping — fetch all pending visible to this manager
      const { data } = await supabase
        .from('leave_requests')
        .select(`*, requester:profiles!leave_requests_requester_id_fkey(full_name, team, role)`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (data) {
        setRequests(data as unknown as Request[]);
        // Fetch balances for each unique requester
        const year = new Date().getFullYear();
        const uniqueIds = [...new Set(data.map((r: any) => r.requester_id))];
        const { data: approved } = await supabase
          .from('leave_requests')
          .select('requester_id, duration_days')
          .in('requester_id', uniqueIds)
          .eq('status', 'approved')
          .gte('start_date', `${year}-01-01`)
          .lte('start_date', `${year}-12-31`);

        const usedMap: Record<string, number> = {};
        approved?.forEach((l: any) => {
          usedMap[l.requester_id] = (usedMap[l.requester_id] ?? 0) + (l.duration_days ?? 0);
        });
        setBalances(usedMap);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('leave_requests').update({
      status: 'approved',
      approver_id: user?.id,
      actioned_at: new Date().toISOString(),
    }).eq('id', id);

    // Email notification (non-blocking)
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'approved', requestId: id }),
    }).catch(console.error);

    setRequests(prev => prev.filter(r => r.id !== id));
  };

  const handleReject = async (id: string, reason: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('leave_requests').update({
      status: 'rejected',
      approver_id: user?.id,
      approver_comment: reason,
      actioned_at: new Date().toISOString(),
    }).eq('id', id);

    // Email notification (non-blocking)
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'rejected', requestId: id }),
    }).catch(console.error);

    setRequests(prev => prev.filter(r => r.id !== id));
    setRejectTarget(null);
  };

  return (
    <AppShell>
      {rejectTarget && (
        <RejectModal onClose={() => setRejectTarget(null)} onSubmit={(reason) => handleReject(rejectTarget, reason)} />
      )}

      <header className="topbar">
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Request Queue</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>Pending requests from your team</p>
        </div>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '999px', padding: '4px 12px' }}>
          {requests.length} pending
        </span>
      </header>

      <div className="page-content fade-in">
        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading…</div>
        ) : requests.length === 0 ? (
          <div className="glass-card" style={{ padding: '60px', textAlign: 'center' }}>
            <CheckCircle size={36} style={{ color: 'var(--success)', margin: '0 auto 12px' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: 500 }}>All caught up!</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>No pending requests right now.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {requests.map(r => {
              const used = balances[r.requester_id] ?? 0;
              const remaining = Math.max(0, ANNUAL_ALLOWANCE - used);
              const wouldExceed = used + r.duration_days > ANNUAL_ALLOWANCE;
              return (
                <div key={r.id} className="glass-card" style={{ padding: '20px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>
                          {r.requester.full_name.charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.requester.full_name}</p>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{r.requester.team} · {r.requester.role.replace(/_/g, ' ')}</p>
                        </div>
                        <StatusBadge status={r.status} />
                        {/* Leave balance chip */}
                        <span style={{
                          fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
                          background: wouldExceed ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.08)',
                          color: wouldExceed ? '#EF4444' : '#22C55E',
                          border: `1px solid ${wouldExceed ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)'}`,
                          display: 'flex', alignItems: 'center', gap: '4px',
                        }}>
                          <Gauge size={11} />
                          {remaining}d left this year{wouldExceed ? ' ⚠️' : ''}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: r.reason ? '10px' : '0' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <CalendarDays size={13} style={{ color: 'var(--text-muted)' }} />{leaveTypeLabel[r.leave_type]}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <Clock size={13} style={{ color: 'var(--text-muted)' }} />{format(new Date(r.start_date), 'dd MMM')} – {format(new Date(r.end_date), 'dd MMM yyyy')} · {r.duration_days}d
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <User size={13} style={{ color: 'var(--text-muted)' }} />Submitted {format(new Date(r.created_at), 'dd MMM yyyy')}
                        </span>
                      </div>
                      {r.reason && (
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>&ldquo;{r.reason}&rdquo;</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                      <button id={`reject-${r.id}`} className="btn btn-danger" onClick={() => setRejectTarget(r.id)}>
                        <XCircle size={14} /> Reject
                      </button>
                      <button id={`approve-${r.id}`} className="btn btn-success" onClick={() => handleApprove(r.id)}>
                        <CheckCircle size={14} /> Approve
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
