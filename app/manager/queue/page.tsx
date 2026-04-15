'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';
import { CheckCircle, XCircle, CalendarDays, User, Clock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const leaveTypeLabel: Record<string, string> = {
  annual: 'Annual Leave', sick: 'Sick Leave', personal: 'Personal', other: 'Other',
};

interface Request {
  id: string;
  requester: { full_name: string; team: string };
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
          Please provide a reason. This will be sent to the engineer by email.
        </p>
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label" htmlFor="reject-reason">Rejection reason <span style={{ color: 'var(--danger)' }}>*</span></label>
          <textarea id="reject-reason" className="form-input" placeholder="e.g. Insufficient cover arranged during critical sprint…" value={reason} onChange={e => setReason(e.target.value)} style={{ minHeight: '100px' }} />
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

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('leave_requests')
      .select(`*, requester:profiles!leave_requests_requester_id_fkey(full_name, team)`)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (data) setRequests(data as unknown as Request[]);
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('leave_requests').update({
      status: 'approved',
      approver_id: user?.id,
      actioned_at: new Date().toISOString(),
    }).eq('id', id);
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
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>✅</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: 500 }}>All caught up!</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>No pending requests right now.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {requests.map(r => (
              <div key={r.id} className="glass-card" style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>
                        {r.requester.full_name.charAt(0)}
                      </div>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.requester.full_name}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.requester.team} team</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '10px' }}>
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
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>&ldquo;{r.reason}&rdquo;</p>
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
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
