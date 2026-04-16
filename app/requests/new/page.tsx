'use client';
import AppShell from '@/components/layout/AppShell';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { CalendarDays, FileText, AlignLeft, Users, AlertTriangle, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { countWorkingDays, getHolidayName, PUBLIC_HOLIDAYS } from '@/lib/public-holidays';
import { getLeaveBalance, ANNUAL_ALLOWANCE } from '@/lib/leave-balance';

const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
];

export default function NewRequestPage() {
  const router = useRouter();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [balance, setBalance] = useState<{ used: number; remaining: number } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const b = await getLeaveBalance(user.id);
      setBalance(b);
    };
    init();
  }, []);

  const workingDays = startDate && endDate
    ? countWorkingDays(new Date(startDate), new Date(endDate))
    : 0;

  // Public holidays in selected range (for info display)
  const holidaysInRange = startDate && endDate
    ? PUBLIC_HOLIDAYS.filter(h => h.date >= startDate && h.date <= endDate)
    : [];

  const remaining = balance?.remaining ?? ANNUAL_ALLOWANCE;
  const wouldExceed = workingDays > 0 && workingDays > remaining;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (wouldExceed) {
      setShowLimitModal(true);
      return;
    }

    setSubmitting(true);
    setError('');

    const form = e.currentTarget;
    const leaveType = (form.elements.namedItem('leave-type') as HTMLSelectElement).value;
    const reason = (form.elements.namedItem('reason') as HTMLTextAreaElement).value;
    const coverNotes = (form.elements.namedItem('cover') as HTMLTextAreaElement).value;

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated'); setSubmitting(false); return; }

    const { error: insertError } = await supabase.from('leave_requests').insert({
      requester_id: user.id,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      duration_days: workingDays,
      reason,
      cover_notes: coverNotes || null,
      status: 'pending',
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    // Fire email notification (non-blocking)
    const { data: newRequest } = await supabase
      .from('leave_requests')
      .select('id')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (newRequest?.id) {
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'submitted', requestId: newRequest.id }),
      }).catch(console.error);
    }

    router.push('/dashboard');
  };

  return (
    <AppShell>
      {/* Limit exceeded modal */}
      {showLimitModal && (
        <div className="modal-overlay" onClick={() => setShowLimitModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertTriangle size={22} style={{ color: '#EF4444' }} />
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Leave limit exceeded</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '20px' }}>
              You only have <strong style={{ color: 'var(--text-primary)' }}>{remaining} day{remaining !== 1 ? 's' : ''}</strong> remaining this year,
              but this request is for <strong style={{ color: '#EF4444' }}>{workingDays} day{workingDays !== 1 ? 's' : ''}</strong>.
              <br /><br />
              Please adjust your dates to fit within your remaining allowance.
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowLimitModal(false)}>
              Adjust dates
            </button>
          </div>
        </div>
      )}

      <header className="topbar">
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>New Leave Request</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>Fill in the details below and submit to your manager</p>
        </div>
        {balance && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 14px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Remaining:</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: balance.remaining <= 5 ? '#F59E0B' : 'var(--text-primary)' }}>
              {balance.remaining} / {ANNUAL_ALLOWANCE}d
            </span>
          </div>
        )}
      </header>

      <div className="page-content fade-in">
        <div style={{ maxWidth: '580px', margin: '0 auto' }}>
          <div className="glass-card" style={{ padding: '28px' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '9px', padding: '10px 13px' }}>
                  <p style={{ fontSize: '13px', color: '#EF4444' }}>{error}</p>
                </div>
              )}

              {/* Leave Type */}
              <div className="form-group">
                <label className="form-label" htmlFor="leave-type">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={13} /> Leave type</span>
                </label>
                <select id="leave-type" name="leave-type" className="form-input" required>
                  <option value="">Select type…</option>
                  {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="start-date">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CalendarDays size={13} /> Start date</span>
                  </label>
                  <input id="start-date" type="date" className="form-input" value={startDate}
                    onChange={e => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(''); }}
                    required style={{ colorScheme: 'dark' }} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="end-date">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CalendarDays size={13} /> End date</span>
                  </label>
                  <input id="end-date" type="date" className="form-input" value={endDate} min={startDate}
                    onChange={e => setEndDate(e.target.value)} required style={{ colorScheme: 'dark' }} />
                </div>
              </div>

              {/* Duration + balance counter */}
              {workingDays > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{
                    background: wouldExceed ? 'rgba(239,68,68,0.06)' : 'var(--bg-elevated)',
                    border: `1px solid ${wouldExceed ? 'rgba(239,68,68,0.25)' : 'var(--border-strong)'}`,
                    borderRadius: '9px', padding: '12px 14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CalendarDays size={14} style={{ color: wouldExceed ? '#EF4444' : 'var(--text-muted)' }} />
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        <strong style={{ color: wouldExceed ? '#EF4444' : 'var(--text-primary)', fontWeight: 600 }}>{workingDays} working day{workingDays !== 1 ? 's' : ''}</strong>
                        {` (excl. weekends & holidays)`}
                      </span>
                    </div>
                    {balance && (
                      <span style={{ fontSize: '12px', fontWeight: 600, color: wouldExceed ? '#EF4444' : 'var(--text-muted)' }}>
                        {wouldExceed ? `⚠️ Exceeds your ${remaining}d remaining` : `${remaining - workingDays}d will remain after`}
                      </span>
                    )}
                  </div>

                  {/* Public holidays in range */}
                  {holidaysInRange.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '9px', padding: '10px 14px' }}>
                      <Info size={13} style={{ color: '#F59E0B', marginTop: '1px', flexShrink: 0 }} />
                      <p style={{ fontSize: '12px', color: '#F59E0B', lineHeight: 1.5 }}>
                        <strong>{holidaysInRange.length} public holiday{holidaysInRange.length > 1 ? 's' : ''} excluded:</strong>{' '}
                        {holidaysInRange.map(h => h.name).join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Reason */}
              <div className="form-group">
                <label className="form-label" htmlFor="reason">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><AlignLeft size={13} /> Reason <span style={{ color: 'var(--danger)' }}>*</span></span>
                </label>
                <textarea id="reason" name="reason" className="form-input" placeholder="Brief description of your leave reason…" required />
              </div>

              {/* Cover */}
              <div className="form-group">
                <label className="form-label" htmlFor="cover">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Users size={13} /> Cover arrangements <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>(optional)</span></span>
                </label>
                <textarea id="cover" name="cover" className="form-input" placeholder="Who will cover your responsibilities? Any handover notes?" />
              </div>

              <div className="divider" style={{ margin: '0' }} />

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => router.back()}>Cancel</button>
                <button id="submit-request" type="submit" className="btn btn-primary" disabled={submitting || workingDays === 0} style={{ opacity: (submitting || workingDays === 0) ? 0.6 : 1 }}>
                  {submitting ? 'Submitting…' : 'Submit request'}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
