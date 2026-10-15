'use client';
/**
 * Employee dashboard: balance, what's next, and every request with actions.
 * Purely presentational; the page owns data loading and mutations.
 */

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { differenceInCalendarDays } from 'date-fns';
import { Ban, CalendarDays, CalendarX2, Check, FileText, MapPin, MoreHorizontal, Pencil, Plus, Save, Thermometer, Trash, Trash2, User } from 'lucide-react';
import { InlineLoader } from 'generative-loaders';
import { EmptyState, SectionLoader } from '@/components/ui/States';
import AppShell from '@/components/layout/AppShell';
import PageHeader, { PageBody } from '@/components/layout/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { SlideButton } from '@/components/ui/MotionButtons';
import { inputClass, labelClass } from '@/components/ui/form';
import Picker from '@/components/ui/Picker';
import DateRangePicker from '@/components/ui/DateRangePicker';
import { countWorkingDays, useHolidays } from '@/lib/public-holidays';
import { LEAVE_TYPES, formatDate, leaveTypeLabel, parseDate, todayStr, type LeaveStatus } from '@/lib/leave';
import type { LeaveBalance } from '@/lib/leave-balance';

export interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  status: LeaveStatus;
  reason: string;
  created_at: string;
}

export interface LeaveEdit {
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
}

/** Mutations return an error message, or null on success. */
interface Props {
  loading: boolean;
  firstName: string;
  balance: LeaveBalance | null;
  requests: LeaveRequest[];
  onSaveEdit: (id: string, changes: LeaveEdit) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
  onCancel: (id: string) => Promise<string | null>;
}

const ACTIVE: LeaveStatus[] = ['pending', 'pending_em_review', 'approved'];

const TYPE_ICON: Record<string, typeof MapPin> = { annual: MapPin, sick: Thermometer, personal: User, other: FileText };

type Filter = 'all' | 'pending' | 'approved' | 'rejected' | 'cancelled';
const FILTERS: { key: Filter; label: string; match: (s: LeaveStatus) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'pending', label: 'Pending', match: (s) => s === 'pending' || s === 'pending_em_review' },
  { key: 'approved', label: 'Approved', match: (s) => s === 'approved' },
  { key: 'rejected', label: 'Rejected', match: (s) => s === 'rejected' },
  { key: 'cancelled', label: 'Cancelled', match: (s) => s === 'cancelled' },
];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function dateRange(r: { start_date: string; end_date: string }) {
  if (r.start_date === r.end_date) return formatDate(r.start_date, 'EEE d MMM');
  const sameYear = r.start_date.slice(0, 4) === r.end_date.slice(0, 4);
  return `${formatDate(r.start_date, sameYear ? 'd MMM' : 'd MMM yyyy')} – ${formatDate(r.end_date, 'd MMM yyyy')}`;
}

// ── Header ───────────────────────────────────────────────────

function useGreeting(firstName: string) {
  // Time-of-day text depends on the viewer's clock, so compute it after mount.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const hour = now?.getHours() ?? 12;
  const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  return {
    date: now ? formatDate(todayStr(), 'EEEE, d MMMM') : '\u00a0',
    title: firstName && now ? `Good ${part}, ${firstName}` : 'Dashboard',
  };
}

// ── Balance + next up ────────────────────────────────────────

function BalanceCard({ balance }: { balance: LeaveBalance | null }) {
  if (!balance) {
    return (
      <section className="flex min-h-[176px] items-center justify-center rounded-2xl border border-white/[0.06] bg-[#111114]">
        <InlineLoader variant="orbit" size={22} color="#71717a" label="Loading your balance" />
      </section>
    );
  }

  const { allowance, used, pending, remaining, adjustment } = balance;
  const pct = (n: number) => `${Math.min(100, (n / Math.max(allowance, 1)) * 100)}%`;
  const year = new Date().getFullYear();

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-[#111114] p-6">
      <p className="text-[12px] font-medium text-zinc-500">Leave balance · {year}</p>
      <p className="mt-2 flex items-baseline gap-2">
        <span className={`text-[44px] font-semibold leading-none tracking-[-0.03em] ${remaining <= 5 ? 'text-amber-300' : 'text-zinc-100'}`}>
          {remaining}
        </span>
        <span className="text-[14px] text-zinc-500">of {allowance} days left</span>
      </p>

      <div className="mt-6 flex h-2 overflow-hidden rounded-full bg-white/[0.05]" role="img" aria-label={`${used} days used, ${pending} pending, ${remaining} left`}>
        <motion.span className="h-full bg-[#3ddc97]" initial={{ width: 0 }} animate={{ width: pct(used) }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
        <motion.span className="h-full bg-violet-400/60" initial={{ width: 0 }} animate={{ width: pct(pending) }} transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-zinc-500">
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[#3ddc97]" />{plural(used, 'day')} used</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-violet-400" />{plural(pending, 'day')} pending</span>
        {adjustment !== 0 && (
          <span className="text-zinc-600">
            {adjustment > 0 ? `+${adjustment}` : adjustment} {Math.abs(adjustment) === 1 ? 'day' : 'days'} adjusted by an admin
          </span>
        )}
      </div>
    </section>
  );
}

function NextUpCard({ requests, loading }: { requests: LeaveRequest[]; loading: boolean }) {
  const today = todayStr();
  const next = requests
    .filter((r) => (r.status === 'approved' || r.status === 'pending' || r.status === 'pending_em_review') && r.end_date >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];

  let when = '';
  if (next) {
    const days = differenceInCalendarDays(parseDate(next.start_date), parseDate(today));
    when = days <= 0 ? 'On leave now' : days === 1 ? 'Starts tomorrow' : `Starts in ${days} days`;
  }
  const Icon = next ? TYPE_ICON[next.leave_type] ?? FileText : CalendarDays;

  return (
    <section className="flex flex-col rounded-2xl border border-white/[0.06] bg-[#111114] p-6">
      <p className="text-[12px] font-medium text-zinc-500">Next up</p>
      {loading ? (
        <div className="flex flex-1 items-center justify-center py-6">
          <InlineLoader variant="orbit" size={22} color="#71717a" label="Loading" />
        </div>
      ) : next ? (
        <Link href={`/requests/${next.id}`} className="group mt-4 flex flex-1 flex-col justify-between gap-4 outline-none">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-zinc-300">
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-zinc-100 group-hover:underline group-hover:decoration-white/20 group-hover:underline-offset-4">
                {leaveTypeLabel(next.leave_type)}
              </p>
              <p className="mt-0.5 text-[13px] text-zinc-500">{dateRange(next)} · {plural(next.duration_days, 'day')}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-zinc-300">{when}</span>
            <StatusBadge status={next.status} />
          </div>
        </Link>
      ) : (
        <div className="mt-4 flex flex-1 flex-col justify-between gap-4">
          <p className="text-[14px] leading-relaxed text-zinc-400">Nothing booked yet. Time for a break?</p>
          <Link href="/requests/new" className="text-[13px] font-medium text-[#3ddc97] hover:underline hover:underline-offset-4">
            Plan some time off →
          </Link>
        </div>
      )}
    </section>
  );
}

// ── Request list ─────────────────────────────────────────────

function RowMenu({ request, onEdit, onDelete, onCancel }: {
  request: LeaveRequest;
  onEdit: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const canEdit = request.status === 'pending';
  const canDelete = request.status === 'pending' || request.status === 'rejected';
  const canCancel = (request.status === 'approved' || request.status === 'pending_em_review') && request.start_date > todayStr();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  if (!canEdit && !canDelete && !canCancel) return <span className="w-8" />;

  const item = 'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] outline-none transition-colors focus-visible:bg-white/[0.06]';
  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Request actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 outline-none transition-colors hover:bg-white/[0.06] hover:text-zinc-200 focus-visible:ring-2 focus-visible:ring-[#3ddc97]/60"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <motion.div
          role="menu"
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.12 }}
          className="absolute right-0 top-9 z-50 min-w-[160px] origin-top-right rounded-xl border border-white/[0.08] bg-[#17171b] p-1 shadow-2xl"
        >
          {canEdit && (
            <button role="menuitem" onClick={run(onEdit)} className={`${item} text-zinc-300 hover:bg-white/[0.06]`}>
              <Pencil className="h-3.5 w-3.5" /> Edit request
            </button>
          )}
          {canDelete && (
            <button role="menuitem" onClick={run(onDelete)} className={`${item} text-red-300 hover:bg-red-500/10`}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
          {canCancel && (
            <button role="menuitem" onClick={run(onCancel)} className={`${item} text-red-300 hover:bg-red-500/10`}>
              <Ban className="h-3.5 w-3.5" /> Cancel leave
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}

function RequestsEmpty({ filtered }: { filtered: boolean }) {
  return filtered ? (
    <EmptyState title="Nothing here" body="No requests match this filter." />
  ) : (
    <EmptyState
      title="No requests yet"
      body="When you request time off, it shows up here with its status."
      action={<SlideButton href="/requests/new" label="Request leave" icon={<Plus className="h-4 w-4" />} />}
    />
  );
}

function RequestList({ requests, loading, onEdit, onDelete, onCancel }: {
  requests: LeaveRequest[];
  loading: boolean;
  onEdit: (r: LeaveRequest) => void;
  onDelete: (r: LeaveRequest) => void;
  onCancel: (r: LeaveRequest) => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');
  const active = FILTERS.find((f) => f.key === filter)!;
  const shown = requests.filter((r) => active.match(r.status));

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-[#111114]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
        <h2 className="text-[14px] font-semibold text-zinc-100">Your requests</h2>
        <div className="-mx-1 flex gap-0.5 overflow-x-auto" role="tablist" aria-label="Filter requests">
          {FILTERS.map((f) => {
            const count = requests.filter((r) => f.match(r.status)).length;
            const on = f.key === filter;
            return (
              <button
                key={f.key}
                role="tab"
                aria-selected={on}
                onClick={() => setFilter(f.key)}
                className={`relative whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#3ddc97]/60 ${on ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                {on && <motion.span layoutId="request-filter" className="absolute inset-0 rounded-full bg-white/[0.07]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                <span className="relative">{f.label}{count > 0 && <span className="ml-1.5 text-zinc-600">{count}</span>}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <SectionLoader text="Loading your requests" />
      ) : shown.length === 0 ? (
        <RequestsEmpty filtered={requests.length > 0} />
      ) : (
        <ul className="divide-y divide-white/[0.05]">
          {shown.map((r) => {
            const Icon = TYPE_ICON[r.leave_type] ?? FileText;
            return (
              <li key={r.id} className="flex items-center pr-2 transition-colors hover:bg-white/[0.02] sm:pr-3">
                <Link
                  href={`/requests/${r.id}`}
                  className="grid min-w-0 flex-1 grid-cols-[auto_1fr_auto] items-center gap-3 py-3.5 pl-4 outline-none focus-visible:bg-white/[0.03] sm:grid-cols-[auto_1fr_80px_110px_110px] sm:gap-4 sm:pl-5"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-zinc-400">
                    <Icon className="h-4 w-4" strokeWidth={1.6} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-zinc-100">{leaveTypeLabel(r.leave_type)}</span>
                    <span className="block truncate text-[12px] text-zinc-500">
                      {dateRange(r)}<span className="sm:hidden"> · {plural(r.duration_days, 'day')}</span>
                    </span>
                  </span>
                  <span className="hidden text-[13px] text-zinc-400 sm:block">{plural(r.duration_days, 'day')}</span>
                  <span><StatusBadge status={r.status} /></span>
                  <span className="hidden text-[12px] text-zinc-500 sm:block">Sent {formatDate(r.created_at.slice(0, 10), 'd MMM')}</span>
                </Link>
                <RowMenu request={r} onEdit={() => onEdit(r)} onDelete={() => onDelete(r)} onCancel={() => onCancel(r)} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ── Modals ───────────────────────────────────────────────────

function EditModal({ request, others, onClose, onSave }: {
  request: LeaveRequest | null;
  /** The user's other requests; active ones can't overlap the new dates. */
  others: LeaveRequest[];
  onClose: () => void;
  onSave: (id: string, changes: LeaveEdit) => Promise<string | null>;
}) {
  const holidays = useHolidays();
  const [form, setForm] = useState<LeaveEdit>({ leave_type: '', start_date: '', end_date: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (request) {
      setForm({ leave_type: request.leave_type, start_date: request.start_date, end_date: request.end_date, reason: request.reason ?? '' });
      setError('');
    }
  }, [request]);

  const days = countWorkingDays(form.start_date, form.end_date, holidays);
  const set = (k: keyof LeaveEdit) => (e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!request) return;
    setSaving(true);
    const err = await onSave(request.id, form);
    setSaving(false);
    if (err) setError(err); else onClose();
  };

  return (
    <Modal open={!!request} onClose={onClose} title="Edit request" description="Saving sends it back to your approver for review.">
      <div className="flex flex-col gap-4">
        {error && <p className="rounded-lg border border-red-400/20 bg-red-500/[0.08] px-3 py-2.5 text-[13px] text-red-300">{error}</p>}
        <div>
          <label htmlFor="edit-type" className={labelClass}>Leave type</label>
          <Picker id="edit-type" value={form.leave_type} onChange={(leave_type) => setForm((f) => ({ ...f, leave_type }))} options={LEAVE_TYPES} />
        </div>
        <div>
          <label htmlFor="edit-dates" className={labelClass}>Dates</label>
          <DateRangePicker
            id="edit-dates"
            start={form.start_date}
            end={form.end_date}
            onChange={(start_date, end_date) => setForm((f) => ({ ...f, start_date, end_date }))}
            holidays={holidays}
            booked={others.filter((o) => o.id !== request?.id && ACTIVE.includes(o.status))}
          />
        </div>
        <label className="block">
          <span className={labelClass}>Reason</span>
          <textarea className={`${inputClass} min-h-[88px] resize-y`} value={form.reason} onChange={set('reason')} />
        </label>
        <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} loading={saving} disabled={days === 0 || !form.reason.trim()} icon={<Save />} hoverIcon={<Check />}>Save changes</Button>
        </div>
      </div>
    </Modal>
  );
}

function ConfirmModal({ target, onClose }: {
  target: { mode: 'delete' | 'cancel'; request: LeaveRequest; run: () => Promise<string | null> } | null;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => setError(''), [target]);

  const copy = target?.mode === 'cancel'
    ? {
        title: 'Cancel this leave?',
        body: 'It stays on record as cancelled, the days go back to your balance, and the calendar event is removed. Your approver is notified.',
        action: 'Cancel leave',
      }
    : { title: 'Delete this request?', body: 'This can’t be undone.', action: 'Delete request' };

  const confirm = async () => {
    if (!target) return;
    setBusy(true);
    const err = await target.run();
    setBusy(false);
    if (err) setError(err); else onClose();
  };

  return (
    <Modal open={!!target} onClose={onClose} title={copy.title} description={target && `${leaveTypeLabel(target.request.leave_type)} · ${dateRange(target.request)}`} size="sm">
      <p className="text-[13px] leading-relaxed text-zinc-400">{copy.body}</p>
      {error && <p className="mt-3 text-[13px] text-red-300">{error}</p>}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>Keep it</Button>
        <Button variant="danger" onClick={confirm} loading={busy} icon={target?.mode === 'cancel' ? <Ban /> : <Trash2 />} hoverIcon={target?.mode === 'cancel' ? <CalendarX2 /> : <Trash />}>
          {copy.action}
        </Button>
      </div>
    </Modal>
  );
}

// ── Page ─────────────────────────────────────────────────────

export default function DashboardView({ loading, firstName, balance, requests, onSaveEdit, onDelete, onCancel }: Props) {
  const [editing, setEditing] = useState<LeaveRequest | null>(null);
  const [confirming, setConfirming] = useState<{ mode: 'delete' | 'cancel'; request: LeaveRequest; run: () => Promise<string | null> } | null>(null);
  const greeting = useGreeting(firstName);

  return (
    <AppShell>
      <PageHeader
        subtitle={greeting.date}
        title={greeting.title}
        actions={<SlideButton href="/requests/new" variant="primary" label="New request" icon={<Plus className="h-4 w-4" />} className="!h-9 !px-4 !text-[13px]" />}
      />

      <PageBody>
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <BalanceCard balance={balance} />
            <NextUpCard requests={requests} loading={loading} />
          </div>
          <RequestList
            requests={requests}
            loading={loading}
            onEdit={setEditing}
            onDelete={(r) => setConfirming({ mode: 'delete', request: r, run: () => onDelete(r.id) })}
            onCancel={(r) => setConfirming({ mode: 'cancel', request: r, run: () => onCancel(r.id) })}
          />
        </div>
      </PageBody>

      <EditModal request={editing} others={requests} onClose={() => setEditing(null)} onSave={onSaveEdit} />
      <ConfirmModal target={confirming} onClose={() => setConfirming(null)} />
    </AppShell>
  );
}
