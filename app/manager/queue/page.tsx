'use client';
import { useState, useEffect, useMemo } from 'react';
import AppShell from '@/components/layout/AppShell';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';
import { CheckCircle, XCircle, CalendarDays, User, Clock, Gauge, Pencil, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ANNUAL_ALLOWANCE } from '@/lib/leave-balance';
import { countWorkingDays } from '@/lib/public-holidays';

const leaveTypeLabel: Record<string, string> = {
  annual: 'Annual Leave', sick: 'Sick Leave', personal: 'Personal', other: 'Other',
};

const LINE_MANAGER_ROLES = ['frontend_line_manager', 'backend_line_manager', 'line_manager'];

interface Request {
  id: string;
  requester_id: string;
  requester: { full_name: string; team: string; role: string };
  leave_type: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  reason: string;
  status: 'pending' | 'pending_em_review' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
}

// Parse a YYYY-MM-DD string as local midnight (avoids UTC offset shifting the date)
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ── Reject / Override modal ──────────────────────────────────────────────────
function RejectModal({
  title,
  onClose,
  onSubmit,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card scale-in" onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>{title}</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
          Please provide a reason. This will be sent to the team member by email.
        </p>
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label" htmlFor="reject-reason">
            Reason <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <textarea
            id="reject-reason"
            className="form-input"
            placeholder="e.g. Insufficient cover during critical sprint…"
            value={reason}
            onChange={e => setReason(e.target.value)}
            style={{ minHeight: '100px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-danger"
            disabled={!reason.trim()}
            style={{ opacity: reason.trim() ? 1 : 0.5 }}
            onClick={() => onSubmit(reason)}
          >
            <XCircle size={14} /> Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit & Approve modal ─────────────────────────────────────────────────────
function EditApproveModal({
  request,
  actionLabel,
  onClose,
  onSubmit,
}: {
  request: Request;
  actionLabel: string;
  onClose: () => void;
  onSubmit: (startDate: string, endDate: string, duration: number, comment: string) => void;
}) {
  const [startDate, setStartDate] = useState(request.start_date);
  const [endDate, setEndDate] = useState(request.end_date);
  const [comment, setComment] = useState('');

  const duration = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return 0;
    return countWorkingDays(parseLocalDate(startDate), parseLocalDate(endDate));
  }, [startDate, endDate]);

  const datesChanged = startDate !== request.start_date || endDate !== request.end_date;
  const isValid = startDate && endDate && endDate >= startDate;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card scale-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Edit dates &amp; {actionLabel.toLowerCase()}
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Adjust the leave dates if needed, then {actionLabel.toLowerCase()}. The engineer will be notified of any changes.
        </p>

        <div className="dates-grid" style={{ marginBottom: '16px' }}>
          <div className="form-group">
            <label className="form-label">Start date</label>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">End date</label>
            <input
              type="date"
              className="form-input"
              value={endDate}
              min={startDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Computed duration */}
        <div style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '10px',
          padding: '12px 14px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Computed working days</span>
          <span style={{ fontSize: '14px', fontWeight: 700, color: duration > 0 ? 'var(--text-primary)' : 'var(--danger)' }}>
            {duration > 0 ? `${duration}d` : 'Invalid range'}
          </span>
        </div>

        {datesChanged && (
          <div style={{
            background: 'rgba(245,158,11,0.07)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '16px',
            fontSize: '12px',
            color: '#F59E0B',
          }}>
            Dates modified from original: {format(parseLocalDate(request.start_date), 'dd MMM')} – {format(parseLocalDate(request.end_date), 'dd MMM yyyy')} ({request.duration_days}d)
          </div>
        )}

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label">Note to employee <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
          <textarea
            className="form-input"
            placeholder="e.g. Adjusted to avoid overlap with sprint deadline…"
            value={comment}
            onChange={e => setComment(e.target.value)}
            style={{ minHeight: '80px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-success"
            disabled={!isValid || duration === 0}
            style={{ opacity: isValid && duration > 0 ? 1 : 0.5 }}
            onClick={() => onSubmit(startDate, endDate, duration, comment)}
          >
            <CheckCircle size={14} /> {actionLabel} ({duration}d)
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function ManagerQueuePage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<string>('');
  const [rejectTarget, setRejectTarget] = useState<{ id: string; isOverride: boolean } | null>(null);
  const [editTarget, setEditTarget] = useState<Request | null>(null);
  const [balances, setBalances] = useState<Record<string, number>>({});

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = profile?.role ?? '';
      setCurrentUserRole(role);

      // Engineering managers see both pending and pending_em_review
      const statuses = role === 'engineering_manager'
        ? ['pending', 'pending_em_review']
        : ['pending'];

      const { data } = await supabase
        .from('leave_requests')
        .select(`*, requester:profiles!leave_requests_requester_id_fkey(full_name, team, role)`)
        .in('status', statuses)
        .order('created_at', { ascending: false });

      if (data) {
        let filtered = (data as unknown as Request[])
          // Never let a manager action their own request
          .filter(r => r.requester_id !== user.id);

        // Scope each role to only the requests they are responsible for
        if (role === 'frontend_line_manager') {
          filtered = filtered.filter(r =>
            r.requester.role === 'frontend_engineer' ||
            (r.requester.role === 'engineer' && r.requester.team === 'frontend')
          );
        } else if (role === 'backend_line_manager') {
          filtered = filtered.filter(r =>
            r.requester.role === 'backend_engineer' ||
            (r.requester.role === 'engineer' && r.requester.team === 'backend')
          );
        } else if (role === 'line_manager') {
          filtered = filtered.filter(r =>
            ['frontend_engineer', 'backend_engineer', 'engineer'].includes(r.requester.role)
          );
        } else if (role === 'engineering_manager') {
          // Directly approves: qa_engineer and line managers (pending)
          // Vets after LM approval: pending_em_review
          filtered = filtered.filter(r =>
            r.status === 'pending_em_review' ||
            (r.status === 'pending' && [
              'qa_engineer', 'frontend_line_manager', 'backend_line_manager', 'line_manager',
            ].includes(r.requester.role))
          );
        } else if (role === 'head_of_product') {
          filtered = filtered.filter(r =>
            ['product_designer', 'product_manager', 'engineering_manager'].includes(r.requester.role)
          );
        } else if (role === 'head_of_operations') {
          filtered = filtered.filter(r =>
            ['operations', 'marketing'].includes(r.requester.role)
          );
        }

        setRequests(filtered);
        const year = new Date().getFullYear();
        const uniqueIds = [...new Set(filtered.map(r => r.requester_id))];
        const { data: approved } = await supabase
          .from('leave_requests')
          .select('requester_id, duration_days')
          .in('requester_id', uniqueIds)
          .eq('status', 'approved')
          .gte('start_date', `${year}-01-01`)
          .lte('start_date', `${year}-12-31`);

        const usedMap: Record<string, number> = {};
        approved?.forEach(l => {
          const id = l.requester_id as string;
          usedMap[id] = (usedMap[id] ?? 0) + ((l.duration_days as number) ?? 0);
        });
        setBalances(usedMap);
      }
    } finally {
      setLoading(false);
    }
  };

  // Line managers route to pending_em_review; everyone else routes to approved
  const getTargetStatus = () =>
    LINE_MANAGER_ROLES.includes(currentUserRole) ? 'pending_em_review' : 'approved';

  const getNotifyEvent = () =>
    LINE_MANAGER_ROLES.includes(currentUserRole) ? 'em_review' : 'approved';

  const handleApprove = async (id: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('leave_requests').update({
      status: getTargetStatus(),
      approver_id: user?.id,
      actioned_at: new Date().toISOString(),
    }).eq('id', id);

    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: getNotifyEvent(), requestId: id }),
    }).catch(console.error);

    setRequests(prev => prev.filter(r => r.id !== id));
  };

  const handleEditApprove = async (
    id: string,
    startDate: string,
    endDate: string,
    duration: number,
    comment: string,
  ) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('leave_requests').update({
      start_date: startDate,
      end_date: endDate,
      duration_days: duration,
      status: getTargetStatus(),
      approver_id: user?.id,
      approver_comment: comment || null,
      actioned_at: new Date().toISOString(),
    }).eq('id', id);

    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: getNotifyEvent(), requestId: id }),
    }).catch(console.error);

    setRequests(prev => prev.filter(r => r.id !== id));
    setEditTarget(null);
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

    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'rejected', requestId: id }),
    }).catch(console.error);

    setRequests(prev => prev.filter(r => r.id !== id));
    setRejectTarget(null);
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const emReviewCount = requests.filter(r => r.status === 'pending_em_review').length;

  return (
    <AppShell>
      {rejectTarget && (
        <RejectModal
          title={rejectTarget.isOverride ? 'Override & reject request' : 'Reject request'}
          onClose={() => setRejectTarget(null)}
          onSubmit={(reason) => handleReject(rejectTarget.id, reason)}
        />
      )}

      {editTarget && (
        <EditApproveModal
          request={editTarget}
          actionLabel={editTarget.status === 'pending_em_review' ? 'Confirm' : 'Approve'}
          onClose={() => setEditTarget(null)}
          onSubmit={(start, end, dur, comment) => handleEditApprove(editTarget.id, start, end, dur, comment)}
        />
      )}

      <header className="topbar">
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Request Queue</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>Pending requests from your team</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {pendingCount > 0 && (
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '999px', padding: '4px 12px' }}>
              {pendingCount} pending
            </span>
          )}
          {emReviewCount > 0 && (
            <span style={{ fontSize: '13px', color: '#A78BFA', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '999px', padding: '4px 12px' }}>
              {emReviewCount} to review
            </span>
          )}
        </div>
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
              const isEmReview = r.status === 'pending_em_review';

              return (
                <div
                  key={r.id}
                  className="glass-card"
                  style={{
                    padding: '20px 22px',
                    borderColor: isEmReview ? 'rgba(139,92,246,0.25)' : undefined,
                  }}
                >
                  {/* EM-review banner */}
                  {isEmReview && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#A78BFA',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: '12px',
                      paddingBottom: '10px',
                      borderBottom: '1px solid rgba(139,92,246,0.15)',
                    }}>
                      <ShieldCheck size={13} /> Line manager approved — awaiting your confirmation
                    </div>
                  )}

                  <div className="queue-card-inner">
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
                          <Clock size={13} style={{ color: 'var(--text-muted)' }} />{format(parseLocalDate(r.start_date), 'dd MMM')} – {format(parseLocalDate(r.end_date), 'dd MMM yyyy')} · {r.duration_days}d
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <User size={13} style={{ color: 'var(--text-muted)' }} />Submitted {format(new Date(r.created_at), 'dd MMM yyyy')}
                        </span>
                      </div>
                      {r.reason && (
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>&ldquo;{r.reason}&rdquo;</p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="queue-card-actions">
                      {isEmReview ? (
                        // EM vetting: Override | Edit & Confirm | Confirm
                        <>
                          <button
                            className="btn btn-danger"
                            onClick={() => setRejectTarget({ id: r.id, isOverride: true })}
                          >
                            <XCircle size={14} /> Override
                          </button>
                          <button
                            className="btn btn-warning"
                            onClick={() => setEditTarget(r)}
                          >
                            <Pencil size={14} /> Edit &amp; Confirm
                          </button>
                          <button
                            className="btn btn-info"
                            onClick={() => handleApprove(r.id)}
                          >
                            <ShieldCheck size={14} /> Confirm
                          </button>
                        </>
                      ) : (
                        // Standard: Reject | Edit & Approve | Approve
                        <>
                          <button
                            className="btn btn-danger"
                            onClick={() => setRejectTarget({ id: r.id, isOverride: false })}
                          >
                            <XCircle size={14} /> Reject
                          </button>
                          <button
                            className="btn btn-warning"
                            onClick={() => setEditTarget(r)}
                          >
                            <Pencil size={14} /> Edit &amp; Approve
                          </button>
                          <button
                            className="btn btn-success"
                            onClick={() => handleApprove(r.id)}
                          >
                            <CheckCircle size={14} /> Approve
                          </button>
                        </>
                      )}
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
