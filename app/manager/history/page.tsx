'use client';
import { useState, useEffect } from 'react';
import AppShell from '@/components/layout/AppShell';
import StatusBadge from '@/components/ui/StatusBadge';
import { format } from 'date-fns';
import { Search, Filter } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatDate, leaveTypeLabel, type LeaveStatus } from '@/lib/leave';
import { teamLabel } from '@/lib/roles';

interface Request {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  status: LeaveStatus;
  created_at: string;
  requester: { full_name: string; team: string };
}

const STATUS_OPTIONS: { value: 'all' | LeaveStatus; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'pending_em_review', label: 'EM review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function ManagerHistoryPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      // RLS limits this to people the manager approves for; drop their own.
      const { data } = await supabase
        .from('leave_requests')
        .select(`*, requester:profiles!leave_requests_requester_id_fkey(full_name, team)`)
        .order('created_at', { ascending: false });

      if (data) setRequests((data as unknown as (Request & { requester_id: string })[]).filter(r => r.requester_id !== user?.id));
      setLoading(false);
    };
    load();
  }, []);

  const filtered = requests.filter(r => {
    const matchSearch = r.requester.full_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <AppShell>
      <header className="topbar">
        <div>
          <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Request History</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>All leave requests across your team</p>
        </div>
      </header>

      <div className="page-content fade-in">
        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input type="text" className="form-input" placeholder="Search by name…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '36px' }} />
          </div>
          <div style={{ position: 'relative' }}>
            <Filter size={13} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }} />
            <select className="form-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ paddingLeft: '34px', minWidth: '150px' }}>
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No requests match your filters</td></tr>
                ) : (
                  filtered.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>
                            {r.requester.full_name.charAt(0)}
                          </div>
                          <div>
                            <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{r.requester.full_name}</p>
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{teamLabel(r.requester.team)}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '13px' }}>{leaveTypeLabel(r.leave_type)}</td>
                      <td style={{ fontSize: '13px' }}>{formatDate(r.start_date, 'dd MMM')} – {formatDate(r.end_date, 'dd MMM yyyy')}</td>
                      <td style={{ fontSize: '13px' }}><span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{r.duration_days}</span>d</td>
                      <td><StatusBadge status={r.status} /></td>
                      <td style={{ fontSize: '12px' }}>{format(new Date(r.created_at), 'dd MMM yyyy')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Showing {filtered.length} of {requests.length} requests</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
