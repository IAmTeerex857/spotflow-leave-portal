'use client';
import AppShell from '@/components/layout/AppShell';
import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { PlusCircle, Clock, CheckCircle, XCircle, ChevronRight, ArrowUpRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Status = 'pending' | 'approved' | 'rejected' | 'cancelled';

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  status: Status;
  created_at: string;
}

const leaveTypeLabel: Record<string, string> = {
  annual: 'Annual Leave',
  sick: 'Sick Leave',
  personal: 'Personal',
  other: 'Other',
};

const leaveTypeIcon: Record<string, string> = {
  annual: '🌴',
  sick: '🤒',
  personal: '📋',
  other: '📝',
};

const statusIcon: Record<Status, React.ReactNode> = {
  approved: <CheckCircle size={14} style={{ color: '#22C55E' }} />,
  pending: <Clock size={14} style={{ color: '#F59E0B' }} />,
  rejected: <XCircle size={14} style={{ color: '#EF4444' }} />,
  cancelled: <XCircle size={14} style={{ color: '#71717A' }} />,
};

export default function DashboardPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch profile name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (profile) setUserName(profile.full_name.split(' ')[0]);

        // Fetch leave requests
        const { data: leaves } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('requester_id', user.id)
          .order('created_at', { ascending: false });

        if (leaves) setRequests(leaves as LeaveRequest[]);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const pending = requests.filter(r => r.status === 'pending').length;
  const approved = requests.filter(r => r.status === 'approved').length;
  const rejected = requests.filter(r => r.status === 'rejected').length;
  const recentThree = requests.slice(0, 3);

  return (
    <AppShell>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {recentThree.map((r) => (
                <Link key={r.id} href={`/requests/${r.id}`} style={{ textDecoration: 'none' }}>
                  <div
                    className="glass-card"
                    style={{ padding: '18px 20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'border-color 0.15s ease, transform 0.15s ease' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                        {leaveTypeIcon[r.leave_type] ?? '📝'}
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

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
          {[
            { label: 'Pending', value: pending, icon: <Clock size={15} />, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
            { label: 'Approved', value: approved, icon: <CheckCircle size={15} />, color: '#22C55E', bg: 'rgba(34,197,94,0.08)' },
            { label: 'Rejected', value: rejected, icon: <XCircle size={15} />, color: '#EF4444', bg: 'rgba(239,68,68,0.08)' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{stat.label}</p>
                <p style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{stat.value}</p>
              </div>
              <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 80px 110px 100px 40px', padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
            {['Type', 'Dates', 'Days', 'Status', 'Submitted', ''].map(col => (
              <span key={col} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading…</div>
          ) : requests.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🗂️</div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>No leave requests yet</p>
              <Link href="/requests/new" className="btn btn-primary" style={{ fontSize: '13px' }}>Submit your first request</Link>
            </div>
          ) : (
            requests.map((r, i) => (
              <Link key={r.id} href={`/requests/${r.id}`} style={{ textDecoration: 'none' }}>
                <div
                  style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 80px 110px 100px 40px', padding: '14px 20px', borderBottom: i < requests.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center', cursor: 'pointer', transition: 'background 0.12s ease' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {statusIcon[r.status]}
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{leaveTypeLabel[r.leave_type]}</span>
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {format(new Date(r.start_date), 'dd MMM')} – {format(new Date(r.end_date), 'dd MMM yyyy')}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{r.duration_days}d</span>
                  <div><StatusBadge status={r.status} /></div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{format(new Date(r.created_at), 'dd MMM yyyy')}</span>
                  <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
