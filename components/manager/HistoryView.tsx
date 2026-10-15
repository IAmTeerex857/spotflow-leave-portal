'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader, { PageBody } from '@/components/layout/PageHeader';
import Avatar from '@/components/ui/Avatar';
import StatusBadge from '@/components/ui/StatusBadge';
import { EmptyState, SectionLoader } from '@/components/ui/States';
import { inputClass } from '@/components/ui/form';
import { formatDate, leaveTypeLabel, type LeaveStatus } from '@/lib/leave';
import { teamLabel } from '@/lib/roles';

export interface HistoryRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  status: LeaveStatus;
  created_at: string;
  requester: { full_name: string; team: string };
}

const FILTERS: { key: 'all' | LeaveStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'pending_em_review', label: 'EM review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'cancelled', label: 'Cancelled' },
];

const range = (r: { start_date: string; end_date: string }) =>
  r.start_date === r.end_date
    ? formatDate(r.start_date, 'd MMM yyyy')
    : `${formatDate(r.start_date, 'd MMM')} – ${formatDate(r.end_date, 'd MMM yyyy')}`;

export default function HistoryView({ loading, requests }: { loading: boolean; requests: HistoryRequest[] }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | LeaveStatus>('all');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((r) =>
      (filter === 'all' || r.status === filter) && (!q || r.requester.full_name.toLowerCase().includes(q)),
    );
  }, [requests, query, filter]);

  return (
    <AppShell>
      <PageHeader title="History" subtitle="Leave requests from the people you approve for" />
      <PageBody>
        <section className="rounded-2xl border border-white/[0.06] bg-[#111114]">
          <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <label className="relative block sm:w-64">
              <span className="sr-only">Search by name</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input className={`${inputClass} !py-2 pl-9`} placeholder="Search by name" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
            <div className="-mx-1 flex gap-0.5 overflow-x-auto" role="tablist" aria-label="Filter by status">
              {FILTERS.map((f) => {
                const count = f.key === 'all' ? requests.length : requests.filter((r) => r.status === f.key).length;
                const on = f.key === filter;
                return (
                  <button
                    key={f.key}
                    role="tab"
                    aria-selected={on}
                    onClick={() => setFilter(f.key)}
                    className={`relative whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#3ddc97]/60 ${on ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {on && <motion.span layoutId="history-filter" className="absolute inset-0 rounded-full bg-white/[0.07]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                    <span className="relative">{f.label}{count > 0 && <span className="ml-1.5 text-zinc-600">{count}</span>}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {loading ? (
            <SectionLoader text="Loading history" />
          ) : shown.length === 0 ? (
            <EmptyState
              title={requests.length ? 'No matches' : 'No history yet'}
              body={requests.length ? 'Try another name or status.' : 'Requests from your team show up here once they’re submitted.'}
              seed="history"
            />
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {shown.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/requests/${r.id}`}
                    className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3.5 outline-none transition-colors hover:bg-white/[0.02] focus-visible:bg-white/[0.03] sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_70px_110px_80px] sm:gap-4 sm:px-5"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar name={r.requester.full_name} size={32} />
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-medium text-zinc-100">{r.requester.full_name}</span>
                        <span className="block truncate text-[12px] text-zinc-500 sm:hidden">{leaveTypeLabel(r.leave_type)} · {range(r)}</span>
                        <span className="hidden truncate text-[12px] text-zinc-500 sm:block">{teamLabel(r.requester.team)}</span>
                      </span>
                    </span>
                    <span className="hidden min-w-0 sm:block">
                      <span className="block truncate text-[13px] text-zinc-300">{leaveTypeLabel(r.leave_type)}</span>
                      <span className="block truncate text-[12px] text-zinc-500">{range(r)}</span>
                    </span>
                    <span className="hidden text-[13px] text-zinc-400 sm:block">{r.duration_days}d</span>
                    <span><StatusBadge status={r.status} /></span>
                    <span className="hidden text-right text-[12px] text-zinc-500 sm:block">{formatDate(r.created_at.slice(0, 10), 'd MMM')}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {!loading && requests.length > 0 && (
            <p className="border-t border-white/[0.05] px-5 py-3 text-[12px] text-zinc-600">Showing {shown.length} of {requests.length}</p>
          )}
        </section>
      </PageBody>
    </AppShell>
  );
}
