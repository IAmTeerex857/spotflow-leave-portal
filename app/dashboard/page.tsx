'use client';
import AppShell from '@/components/layout/AppShell';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import { useEffect, useState, useRef } from 'react';
import { format } from 'date-fns';
import { PlusCircle, Clock, CheckCircle, XCircle, ChevronRight, ArrowUpRight, MapPin, Thermometer, User, FileText, MoreHorizontal, Pencil, Trash2, CalendarDays, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getLeaveBalance, ANNUAL_ALLOWANCE, type LeaveBalance } from '@/lib/leave-balance';
import { countWorkingDays } from '@/lib/public-holidays';

type Status = 'pending' | 'approved' | 'rejected' | 'cancelled';

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  status: Status;
  reason: string;
  created_at: string;
}

const leaveTypeLabel: Record<string, string> = {
  annual: 'Annual Leave',
  sick: 'Sick Leave',
  personal: 'Personal',
  other: 'Other',
};

const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
];

const leaveTypeIcon: Record<string, React.ReactNode> = {
  annual: <MapPin size={20} strokeWidth={1.5} />,
  sick: <Thermometer size={20} strokeWidth={1.5} />,
  personal: <User size={20} strokeWidth={1.5} />,
  other: <FileText size={20} strokeWidth={1.5} />,
};

const statusIcon: Record<Status, React.ReactNode> = {
  approved: <CheckCircle size={14} style={{ color: '#22C55E' }} />,
  pending: <Clock size={14} style={{ color: '#F59E0B' }} />,
  rejected: <XCircle size={14} style={{ color: '#EF4444' }} />,
  cancelled: <XCircle size={14} style={{ color: '#71717A' }} />,
};

// ── Edit Modal ──────────────────────────────────────────────────────────────
function EditModal({ request, onClose, onSave }: {
  request: LeaveRequest;
  onClose: () => void;
  onSave: (updated: Partial<LeaveRequest>) => void;
}) {
  const [leaveType, setLeaveType] = useState(request.leave_type);
  const [startDate, setStartDate] = useState(request.start_date);
  const [endDate, setEndDate] = useState(request.end_date);
  const [reason, setReason] = useState(request.reason ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const workingDays = startDate && endDate
    ? countWorkingDays(new Date(startDate), new Date(endDate))
    : 0;

  const handleSave = async () => {
    setSaving(true);
    setError('');
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from('leave_requests')
      .update({
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        duration_days: workingDays,
        reason,
        status: 'pending',         // reset for re-approval
        approver_id: null,
        approver_comment: null,
        actioned_at: null,
      })
      .eq('id', request.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    onSave({ leave_type: leaveType, start_date: startDate, end_date: endDate, duration_days: workingDays, reason });
    setSaving(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Edit leave request</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>Changes will reset status to pending for re-approval.</p>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px 13px', marginBottom: '14px' }}>
            <p style={{ fontSize: '13px', color: '#EF4444' }}>{error}</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Leave type */}
          <div className="form-group">
            <label className="form-label" htmlFor="edit-type">
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><FileText size={12} /> Leave type</span>
            </label>
            <select id="edit-type" className="form-input" value={leaveType} onChange={e => setLeaveType(e.target.value)}>
              {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-start">
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><CalendarDays size={12} /> Start date</span>
              </label>
              <input id="edit-start" type="date" className="form-input" value={startDate}
                onChange={e => { setStartDate(e.target.value); if (endDate < e.target.value) setEndDate(e.target.value); }}
                style={{ colorScheme: 'dark' }} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-end">
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><CalendarDays size={12} /> End date</span>
              </label>
              <input id="edit-end" type="date" className="form-input" value={endDate} min={startDate}
                onChange={e => setEndDate(e.target.value)} style={{ colorScheme: 'dark' }} />
            </div>
          </div>

          {/* Duration */}
          {workingDays > 0 && (
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{workingDays} working day{workingDays !== 1 ? 's' : ''}</strong> (excl. weekends & holidays)
            </div>
          )}

          {/* Reason */}
          <div className="form-group">
            <label className="form-label" htmlFor="edit-reason">Reason</label>
            <textarea id="edit-reason" className="form-input" value={reason} onChange={e => setReason(e.target.value)} style={{ minHeight: '80px' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || workingDays === 0} style={{ opacity: saving || workingDays === 0 ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ────────────────────────────────────────────────────
function DeleteModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '11px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <AlertTriangle size={20} style={{ color: '#EF4444' }} />
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>Delete leave request?</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
          This action cannot be undone. The request will be permanently removed.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={async () => { setDeleting(true); await onConfirm(); setDeleting(false); }} disabled={deleting} style={{ opacity: deleting ? 0.7 : 1 }}>
            <Trash2 size={13} /> {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Row Actions Dropdown ────────────────────────────────────────────────────
function RowActions({ request, onEdit, onDelete }: {
  request: LeaveRequest;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '6px', transition: 'background 0.12s ease' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
      >
        <MoreHorizontal size={15} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '32px', zIndex: 50,
          background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
          borderRadius: '10px', padding: '4px', minWidth: '140px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          animation: 'scaleIn 0.12s ease',
        }}>
          {/* Edit — only for pending */}
          {request.status === 'pending' && (
            <button
              onClick={e => { e.stopPropagation(); setOpen(false); onEdit(); }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 10px', borderRadius: '7px', fontSize: '13px', color: 'var(--text-secondary)', transition: 'background 0.1s ease' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <Pencil size={13} /> Edit request
            </button>
          )}
          {/* Delete */}
          <button
            onClick={e => { e.stopPropagation(); setOpen(false); onDelete(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 10px', borderRadius: '7px', fontSize: '13px', color: '#EF4444', transition: 'background 0.1s ease' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<LeaveRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const refreshBalance = async (uid: string) => {
    const bal = await getLeaveBalance(uid);
    setBalance(bal);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (profile) setUserName(profile.full_name.split(' ')[0]);

        const { data: leaves } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('requester_id', user.id)
          .order('created_at', { ascending: false });

        if (leaves) setRequests(leaves as LeaveRequest[]);

        setUserId(user.id);
        const bal = await getLeaveBalance(user.id);
        setBalance(bal);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase.from('leave_requests').delete().eq('id', id);
    setRequests(prev => prev.filter(r => r.id !== id));
    setDeleteTarget(null);
    if (userId) await refreshBalance(userId);
  };

  const handleEditSave = async (id: string, updated: Partial<LeaveRequest>) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, ...updated, status: 'pending' } : r));
    if (userId) await refreshBalance(userId);
    // Re-notify manager that request was updated
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'submitted', requestId: id }),
    }).catch(console.error);
  };

  const pending = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;
  const rejected = requests.filter(r => r.status === 'rejected').length;
  const recentThree = requests.slice(0, 3);

  return (
    <AppShell>
      {/* Edit modal */}
      {editTarget && (
        <EditModal
          request={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(updated) => { handleEditSave(editTarget.id, updated); setEditTarget(null); }}
        />
      )}

      {/* Delete modal */}
      {deleteTarget && (
        <DeleteModal
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}

      <header className="topbar">
        <div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {format(new Date(), 'EEEE, dd MMMM yyyy')}
          </p>
          <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '1px' }}>
            {userName ? `Good day, ${userName} 👋` : 'Dashboard'}
          </h1>
        </div>
        <Link href="/requests/new" className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 16px' }}>
          <PlusCircle size={14} />
          New Request
        </Link>
      </header>

      <div className="page-content fade-in">

        {/* Recent Requests quick-access cards */}
        {recentThree.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
              Recent Requests
            </p>
            <div className="dash-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {recentThree.map((r) => (
                <Link key={r.id} href={`/requests/${r.id}`} style={{ textDecoration: 'none' }}>
                  <div
                    className="glass-card"
                    style={{ padding: '18px 20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'border-color 0.15s ease, transform 0.15s ease' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                        {leaveTypeIcon[r.leave_type] ?? <FileText size={20} strokeWidth={1.5} />}
                      </div>
                      <ArrowUpRight size={14} style={{ color: 'var(--text-muted)', marginTop: '2px' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '3px' }}>
                        {leaveTypeLabel[r.leave_type]}
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {format(new Date(r.start_date), 'dd MMM')} – {format(new Date(r.end_date), 'dd MMM yyyy')} · {r.duration_days}d
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Balance widget */}
        {balance && (
          <div className="glass-card" style={{ padding: '16px 20px', marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={16} style={{ color: 'var(--text-secondary)' }} />
              </div>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Leave Balance {new Date().getFullYear()}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '1px' }}>
                  <strong>{balance.used}</strong> used · <strong>{balance.pending}</strong> pending · <strong style={{ color: balance.remaining <= 5 ? '#F59E0B' : '#22C55E' }}>{balance.remaining} remaining</strong> of {ANNUAL_ALLOWANCE}
                </p>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: '160px', maxWidth: '240px' }}>
              <div style={{ height: '6px', borderRadius: '99px', background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: '99px',
                  width: `${Math.min(100, Math.round((balance.used / ANNUAL_ALLOWANCE) * 100))}%`,
                  background: balance.remaining <= 5 ? '#EF4444' : balance.remaining <= 10 ? '#F59E0B' : '#22C55E',
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                {Math.round((balance.used / ANNUAL_ALLOWANCE) * 100)}% used
              </p>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="dash-stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
          {[
            { label: 'Pending', value: pending, icon: <Clock size={15} />, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
            { label: 'Approved', value: approved, icon: <CheckCircle size={15} />, color: '#22C55E', bg: 'rgba(34,197,94,0.08)' },
            { label: 'Rejected', value: rejected, icon: <XCircle size={15} />, color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{stat.label}</p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{stat.value}</p>
              </div>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, flexShrink: 0 }}>
                {stat.icon}
              </div>
            </div>
          ))}
        </div>

        {/* All Requests table */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>All Requests</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '999px', padding: '1px 8px' }}>
                {requests.length}
              </span>
            </div>
            <Link href="/requests/new" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500 }}>
              <PlusCircle size={13} /> New
            </Link>
          </div>

          {/* Column headers */}
          <div className="req-table-header" style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 80px 110px 100px 40px', padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</span>
            <span className="req-col-header-dates" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dates</span>
            <span className="req-col-header-days" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Days</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</span>
            <span className="req-col-header-submitted" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Submitted</span>
            <span></span>
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading…</div>
          ) : requests.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>No leave requests yet</p>
              <Link href="/requests/new" className="btn btn-primary" style={{ fontSize: '13px' }}>Submit your first request</Link>
            </div>
          ) : (
            requests.map((r, i) => (
              <div
                key={r.id}
                className="req-table-row"
                style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 80px 110px 100px 40px', padding: '14px 20px', borderBottom: i < requests.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center', transition: 'background 0.12s ease' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {statusIcon[r.status]}
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{leaveTypeLabel[r.leave_type]}</span>
                </div>
                <span className="req-col-dates" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {format(new Date(r.start_date), 'dd MMM')} – {format(new Date(r.end_date), 'dd MMM yyyy')}
                </span>
                <span className="req-col-days" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{r.duration_days}d</span>
                <div><StatusBadge status={r.status} /></div>
                <span className="req-col-submitted" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{format(new Date(r.created_at), 'dd MMM yyyy')}</span>
                {/* Row actions */}
                <RowActions
                  request={r}
                  onEdit={() => setEditTarget(r)}
                  onDelete={() => setDeleteTarget(r.id)}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
