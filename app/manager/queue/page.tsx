'use client';
import { useState, useEffect, useMemo } from 'react';
import AppShell from '@/components/layout/AppShell';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';
import { CheckCircle, XCircle, CalendarDays, User, Clock, Gauge, Pencil, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getLeaveBalances, type LeaveBalance } from '@/lib/leave-balance';
import { countWorkingDays, useHolidays } from '@/lib/public-holidays';
import { errorMessage, formatDate, leaveTypeLabel } from '@/lib/leave';
import { LINE_MANAGER_ROLES, type Role } from '@/lib/roles';

/** Row shape returned by the approval_queue() RPC. */
interface Request {
  id: string;
  requester_id: string;
  requester_name: string;
  requester_team: string;
  requester_role: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  reason: string;
  status: 'pending' | 'pending_em_review';
  created_at: string;
  line_manager_name: string | null;
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
  const holidays = useHolidays();

  const duration = useMemo(
    () => countWorkingDays(startDate, endDate, holidays),
    [startDate, endDate, holidays],
  );

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
            Dates modified from original: {formatDate(request.start_date, 'dd MMM')} – {formatDate(request.end_date)} ({request.duration_days}d)
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
  const [balances, setBalances] = useState<Record<string, LeaveBalance>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      setCurrentUserRole(profile?.role ?? '');

      // The database decides what this user may act on (same rules as RLS).
      const { data, error } = await supabase.rpc('approval_queue');
      if (error) throw error;
      const queue = (data ?? []) as Request[];
      setRequests(queue);

      const ids = [...new Set(queue.map(r => r.requester_id))];
      if (ids.length) {
        const rows = await getLeaveBalances(ids);
        setBalances(Object.fromEntries(rows.map(b => [b.user_id, b])));
      }
    } catch (err) {
      setActionError(errorMessage(err, 'Could not load the queue.'));
    } finally {
      setLoading(false);
    }
  };

  const notify = (event: string, requestId: string) =>
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, requestId }),
    }).catch(console.error);

  const decide = async (
    id: string,
    decision: 'approve' | 'reject',
    opts: { comment?: string; startDate?: string; endDate?: string } = {},
  ) => {
    setBusyId(id);
    setActionError('');
    const { data, error } = await createClient().rpc('decide_leave_request', {
      p_request_id: id,
      p_decision: decision,
      p_comment: opts.comment ?? null,
      p_start_date: opts.startDate ?? null,
      p_end_date: opts.endDate ?? null,
    });
    setBusyId(null);

    if (error) {
      setActionError(errorMessage(error));
      return false;
    }

    // Only notify about the status the database actually recorded.
    const status = (data as { status: string }).status;
    notify(status === 'pending_em_review' ? 'em_review' : status, id);
    setRequests(prev => prev.filter(r => r.id !== id));
    return true;
  };

  const handleApprove = (id: string) => decide(id, 'approve');

  const handleEditApprove = async (id: string, startDate: string, endDate: string, comment: string) => {
    if (await decide(id, 'approve', { startDate, endDate, comment })) setEditTarget(null);
  };

  const handleReject = async (id: string, reason: string) => {
    if (await decide(id, 'reject', { comment: reason })) setRejectTarget(null);
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
          onSubmit={(start, end, _dur, comment) => handleEditApprove(editTarget.id, start, end, comment)}
        />
      )}

      <header className="topbar">
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Request Queue</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>
            {LINE_MANAGER_ROLES.includes(currentUserRole as Role)
              ? 'Your approvals go to the Engineering Manager for confirmation'
              : 'Pending requests from your team'}
          </p>
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
        {actionError && (
          <div role="alert" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#EF4444' }}>
            {actionError}
          </div>
        )}
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
              const balance = balances[r.requester_id];
              const remaining = balance?.remaining ?? 0;
              // This request's own days are already in balance.pending.
              const wouldExceed = balance ? balance.used + balance.pending > balance.allowance : false;
              const isEmReview = r.status === 'pending_em_review';
              const busy = busyId === r.id;

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
                      <ShieldCheck size={13} /> Approved by {r.line_manager_name ?? 'line manager'} — awaiting your confirmation
                    </div>
                  )}

                  <div className="queue-card-inner">
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>
                          {r.requester_name.charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.requester_name}</p>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{r.requester_team} · {r.requester_role.replace(/_/g, ' ')}</p>
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
                          <CalendarDays size={13} style={{ color: 'var(--text-muted)' }} />{leaveTypeLabel(r.leave_type)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <Clock size={13} style={{ color: 'var(--text-muted)' }} />{formatDate(r.start_date, 'dd MMM')} – {formatDate(r.end_date)} · {r.duration_days}d
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
                            disabled={busy}
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
                            disabled={busy}
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
