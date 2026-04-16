'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isToday, addMonths, subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { getHolidayName, isPublicHoliday } from '@/lib/public-holidays';

interface LeaveEntry {
  id: string;
  requester_id: string;
  start_date: string;
  end_date: string;
  requester: { full_name: string; team: string };
  leave_type: string;
  status: string;
}

// Deterministic colour from a name string
const PILL_COLOURS = [
  { bg: 'rgba(99,102,241,0.18)', border: 'rgba(99,102,241,0.35)', text: '#a5b4fc' },
  { bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.3)', text: '#f9a8d4' },
  { bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', text: '#6ee7b7' },
  { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', text: '#fcd34d' },
  { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.25)', text: '#fca5a5' },
  { bg: 'rgba(14,165,233,0.15)', border: 'rgba(14,165,233,0.3)', text: '#7dd3fc' },
  { bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.3)', text: '#d8b4fe' },
  { bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.3)', text: '#fde68a' },
];

function colourForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PILL_COLOURS[Math.abs(hash) % PILL_COLOURS.length];
}

function isLeaveOnDay(entry: LeaveEntry, dateStr: string): boolean {
  return dateStr >= entry.start_date && dateStr <= entry.end_date;
}

export default function CalendarPage() {
  const [month, setMonth] = useState(new Date());
  const [leaves, setLeaves] = useState<LeaveEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaves = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const start = format(startOfMonth(month), 'yyyy-MM-dd');
        const end = format(endOfMonth(month), 'yyyy-MM-dd');

        const { data } = await supabase
          .from('leave_requests')
          .select(`id, requester_id, start_date, end_date, leave_type, status,
                   requester:profiles!leave_requests_requester_id_fkey(full_name, team)`)
          .in('status', ['approved', 'pending'])
          .or(`start_date.lte.${end},end_date.gte.${start}`)
          .order('start_date', { ascending: true });

        if (data) setLeaves(data as unknown as LeaveEntry[]);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaves();
  }, [month]);

  // Build calendar grid (Mon–Sun)
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <AppShell>
      <header className="topbar">
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Team Calendar</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>Approved & pending leave across your team</p>
        </div>
        {/* Month navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setMonth(m => subMonths(m, 1))}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', minWidth: '130px', textAlign: 'center' }}>
            {format(month, 'MMMM yyyy')}
          </span>
          <button
            onClick={() => setMonth(m => addMonths(m, 1))}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setMonth(new Date())}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500 }}
          >
            Today
          </button>
        </div>
      </header>

      <div className="page-content fade-in" style={{ padding: '20px 28px' }}>
        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Public holiday</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.35)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>On leave</span>
          </div>
        </div>

        <div className="glass-card" style={{ overflow: 'hidden' }}>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
            {DAY_LABELS.map(d => (
              <div key={d} style={{
                padding: '10px 4px', textAlign: 'center',
                fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                borderRight: '1px solid var(--border)',
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading…</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {days.map((day, i) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const inMonth = isSameMonth(day, month);
                const today = isToday(day);
                const holiday = isPublicHoliday(dateStr) ? getHolidayName(dateStr) : null;
                const dayLeaves = leaves.filter(l => isLeaveOnDay(l, dateStr));
                const isWeekendDay = day.getDay() === 0 || day.getDay() === 6;

                return (
                  <div
                    key={dateStr}
                    style={{
                      minHeight: '90px',
                      padding: '6px 8px',
                      borderRight: (i + 1) % 7 === 0 ? 'none' : '1px solid var(--border)',
                      borderBottom: i < days.length - 7 ? '1px solid var(--border)' : 'none',
                      background: holiday
                        ? 'rgba(255,255,255,0.02)'
                        : isWeekendDay ? 'rgba(0,0,0,0.15)' : 'transparent',
                      opacity: inMonth ? 1 : 0.35,
                    }}
                  >
                    {/* Date number */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: today ? 700 : 400,
                        color: today ? 'var(--text-primary)' : 'var(--text-muted)',
                        width: '22px', height: '22px',
                        borderRadius: '50%',
                        background: today ? 'rgba(255,255,255,0.12)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {format(day, 'd')}
                      </span>
                    </div>

                    {/* Public holiday label */}
                    {holiday && (
                      <div style={{
                        fontSize: '9px', fontWeight: 600, color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                        marginBottom: '3px', lineHeight: 1.2,
                      }}>
                        {holiday}
                      </div>
                    )}

                    {/* Leave pills */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {dayLeaves.slice(0, 3).map(l => {
                        const colour = colourForName(l.requester.full_name);
                        const firstName = l.requester.full_name.split(' ')[0];
                        const isPending = l.status === 'pending';
                        return (
                          <div
                            key={l.id}
                            title={`${l.requester.full_name} — ${l.leave_type}${isPending ? ' (pending)' : ''}`}
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: colour.bg,
                              border: `1px solid ${colour.border}`,
                              color: colour.text,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              opacity: isPending ? 0.65 : 1,
                            }}
                          >
                            {firstName}
                          </div>
                        );
                      })}
                      {dayLeaves.length > 3 && (
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', paddingLeft: '2px' }}>
                          +{dayLeaves.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
