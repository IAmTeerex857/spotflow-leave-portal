'use client';
import AppShell from '@/components/layout/AppShell';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { differenceInBusinessDays, addDays, format } from 'date-fns';
import { CalendarDays, FileText, AlignLeft, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
];

function calcWorkingDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (e < s) return 0;
  return differenceInBusinessDays(addDays(e, 1), s);
}

export default function NewRequestPage() {
  const router = useRouter();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const workingDays = calcWorkingDays(startDate, endDate);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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

    router.push('/dashboard');
  };

  return (
    <AppShell>
      <header className="topbar">
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>New Leave Request</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>Fill in the details below and submit to your manager</p>
        </div>
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
                  <input id="start-date" type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} required style={{ colorScheme: 'dark' }} />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="end-date">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><CalendarDays size={13} /> End date</span>
                  </label>
                  <input id="end-date" type="date" className="form-input" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} required style={{ colorScheme: 'dark' }} />
                </div>
              </div>

              {/* Duration counter */}
              {workingDays > 0 && (
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: '9px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CalendarDays size={14} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{workingDays} working day{workingDays !== 1 ? 's' : ''}</strong>
                    {` · ${format(new Date(startDate), 'dd MMM')} – ${format(new Date(endDate), 'dd MMM yyyy')}`}
                  </span>
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
                <button id="submit-request" type="submit" className="btn btn-primary" disabled={submitting} style={{ opacity: submitting ? 0.7 : 1 }}>
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
