'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCheck, CircleX, FileText, MapPin, Pencil, PencilLine, ShieldCheck, Thermometer, User, X } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader, { PageBody } from '@/components/layout/PageHeader';
import { useProfile } from '@/components/layout/ProfileContext';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import { EmptyState, SectionLoader } from '@/components/ui/States';
import { inputClass, labelClass } from '@/components/ui/form';
import DateRangePicker from '@/components/ui/DateRangePicker';
import { countWorkingDays, useHolidays } from '@/lib/public-holidays';
import { formatDate, leaveTypeLabel } from '@/lib/leave';
import type { LeaveBalance } from '@/lib/leave-balance';
import { LINE_MANAGER_ROLES, roleLabel, teamLabel, type Role } from '@/lib/roles';

/** Row shape returned by the approval_queue() RPC. */
export interface QueueRequest {
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
  cover_notes: string | null;
  status: 'pending' | 'pending_em_review';
  created_at: string;
  line_manager_name: string | null;
}

export type Decide = (
  id: string,
  decision: 'approve' | 'reject',
  opts?: { comment?: string; startDate?: string; endDate?: string },
) => Promise<string | null>;

const TYPE_ICON: Record<string, typeof MapPin> = { annual: MapPin, sick: Thermometer, personal: User, other: FileText };
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const range = (r: { start_date: string; end_date: string }) =>
  r.start_date === r.end_date
    ? formatDate(r.start_date, 'EEE d MMM yyyy')
    : `${formatDate(r.start_date, 'EEE d MMM')} – ${formatDate(r.end_date, 'EEE d MMM yyyy')}`;

function RejectModal({ target, onClose, onConfirm }: {
  target: QueueRequest | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<string | null>;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { setReason(''); setError(''); }, [target]);
  const override = target?.status === 'pending_em_review';

  const submit = async () => {
    setBusy(true);
    const err = await onConfirm(reason.trim());
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <Modal
      open={!!target}
      onClose={onClose}
      title={override ? 'Override and reject' : 'Reject request'}
      description={target ? `${target.requester_name} · ${leaveTypeLabel(target.leave_type)} · ${range(target)}` : undefined}
    >
      <label className="block">
        <span className={labelClass}>Reason <span className="text-zinc-600">· sent to {target?.requester_name.split(' ')[0] ?? 'them'} by email</span></span>
        <textarea className={`${inputClass} min-h-[100px] resize-y`} placeholder="e.g. We need cover during the release that week" value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      {error && <p className="mt-3 text-[13px] text-red-300">{error}</p>}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={submit} loading={busy} disabled={!reason.trim()} icon={<X className="h-3.5 w-3.5" />} hoverIcon={<CircleX />}>
          {override ? 'Override' : 'Reject'}
        </Button>
      </div>
    </Modal>
  );
}

function EditModal({ target, approveLabel, onClose, onConfirm }: {
  target: QueueRequest | null;
  approveLabel: string;
  onClose: () => void;
  onConfirm: (start: string, end: string, comment: string) => Promise<string | null>;
}) {
  const holidays = useHolidays();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (target) { setStart(target.start_date); setEnd(target.end_date); setComment(''); setError(''); }
  }, [target]);

  const days = countWorkingDays(start, end, holidays);
  const changed = !!target && (start !== target.start_date || end !== target.end_date);

  const submit = async () => {
    setBusy(true);
    const err = await onConfirm(start, end, comment.trim());
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <Modal open={!!target} onClose={onClose} title={`Adjust dates and ${approveLabel.toLowerCase()}`} description="The employee is emailed the final dates.">
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="adjust-dates" className={labelClass}>Dates</label>
          <DateRangePicker id="adjust-dates" start={start} end={end} onChange={(a, b) => { setStart(a); setEnd(b); }} holidays={holidays} />
        </div>
        <p className="text-[13px] text-zinc-400">
          <span className={`font-semibold ${days > 0 ? 'text-zinc-100' : 'text-red-300'}`}>{days > 0 ? plural(days, 'working day') : 'No working days in range'}</span>
          {changed && target && <span className="text-zinc-500"> · was {range(target)} ({target.duration_days}d)</span>}
        </p>
        <label className="block">
          <span className={labelClass}>Note <span className="text-zinc-600">· optional</span></span>
          <textarea className={`${inputClass} min-h-[80px] resize-y`} placeholder="e.g. Moved a day to avoid the sprint demo" value={comment} onChange={(e) => setComment(e.target.value)} />
        </label>
        {error && <p className="text-[13px] text-red-300">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="success" onClick={submit} loading={busy} disabled={days === 0} icon={<Check className="h-3.5 w-3.5" />} hoverIcon={<CheckCheck />}>
            {approveLabel} · {plural(days, 'day')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function QueueCard({ r, balance, busy, onApprove, onEdit, onReject }: {
  r: QueueRequest;
  balance?: LeaveBalance;
  busy: boolean;
  onApprove: () => void;
  onEdit: () => void;
  onReject: () => void;
}) {
  const Icon = TYPE_ICON[r.leave_type] ?? FileText;
  const emReview = r.status === 'pending_em_review';
  // The request's own days are already counted in balance.pending.
  const over = balance ? balance.used + balance.pending > balance.allowance : false;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
      className={`overflow-hidden rounded-2xl border bg-[#111114] ${emReview ? 'border-violet-400/20' : 'border-white/[0.06]'}`}
    >
      {emReview && (
        <p className="flex items-center gap-2 border-b border-violet-400/10 bg-violet-400/[0.04] px-5 py-2.5 text-[12px] font-medium text-violet-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          Approved by {r.line_manager_name ?? 'their line manager'} · waiting for your confirmation
        </p>
      )}
      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={r.requester_name} size={38} />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-zinc-100">{r.requester_name}</p>
              <p className="truncate text-[12px] text-zinc-500">{teamLabel(r.requester_team)} · {roleLabel(r.requester_role)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {balance && (
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${over ? 'border-red-400/25 bg-red-500/10 text-red-300' : 'border-white/[0.07] text-zinc-400'}`}>
                {over ? 'Over allowance' : `${balance.remaining} of ${balance.allowance} days left`}
              </span>
            )}
            <StatusBadge status={r.status} />
          </div>
        </div>

        <Link href={`/requests/${r.id}`} className="group flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 transition-colors hover:border-white/10">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] text-zinc-400">
            <Icon className="h-4 w-4" strokeWidth={1.6} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-medium text-zinc-100">{leaveTypeLabel(r.leave_type)} · {plural(r.duration_days, 'day')}</span>
            <span className="block truncate text-[12px] text-zinc-500">{range(r)}</span>
          </span>
          <span className="hidden text-[12px] text-zinc-600 group-hover:text-zinc-400 sm:block">Details →</span>
        </Link>

        {r.reason && <p className="text-[13px] leading-relaxed text-zinc-400">“{r.reason}”</p>}

        <div className="flex flex-col gap-2 border-t border-white/[0.05] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-zinc-600">Sent {formatDate(r.created_at.slice(0, 10), 'd MMM')}</p>
          <div className="grid grid-cols-3 gap-2 sm:flex">
            <Button variant="danger" size="sm" onClick={onReject} disabled={busy} icon={<X className="h-3.5 w-3.5" />} hoverIcon={<CircleX />}>{emReview ? 'Override' : 'Reject'}</Button>
            <Button variant="secondary" size="sm" onClick={onEdit} disabled={busy} icon={<Pencil className="h-3.5 w-3.5" />} hoverIcon={<PencilLine />}>Adjust</Button>
            <Button variant="success" size="sm" onClick={onApprove} loading={busy} icon={emReview ? <ShieldCheck /> : <Check />} hoverIcon={<CheckCheck />}>{emReview ? 'Confirm' : 'Approve'}</Button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function Queue({ loading, loadError, role, requests, balances, onDecide }: {
  loading: boolean;
  loadError: string;
  role: string;
  requests: QueueRequest[];
  balances: Record<string, LeaveBalance>;
  onDecide: Decide;
}) {
  const { refresh } = useProfile();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [rejecting, setRejecting] = useState<QueueRequest | null>(null);
  const [editing, setEditing] = useState<QueueRequest | null>(null);
  const lineManager = LINE_MANAGER_ROLES.includes(role as Role);

  const decide: Decide = async (id, decision, opts) => {
    setBusyId(id);
    setError('');
    const err = await onDecide(id, decision, opts);
    setBusyId(null);
    if (err) setError(err); else refresh();
    return err;
  };

  const pending = requests.filter((r) => r.status === 'pending').length;
  const review = requests.length - pending;

  return (
    <>
      <PageHeader
        width="max-w-3xl"
        title="Approvals"
        subtitle={lineManager ? 'Your approvals go to the Engineering Manager for a final check' : 'Requests waiting on you'}
        actions={!loading && requests.length > 0 && (
          <span className="flex gap-2 text-[12px]">
            {pending > 0 && <span className="rounded-full border border-white/[0.07] px-2.5 py-1 text-zinc-400">{pending} pending</span>}
            {review > 0 && <span className="rounded-full border border-violet-400/20 px-2.5 py-1 text-violet-300">{review} to confirm</span>}
          </span>
        )}
      />
      <PageBody width="max-w-3xl">
        {(error || loadError) && (
          <p role="alert" className="mb-4 rounded-xl border border-red-400/20 bg-red-500/[0.08] px-4 py-3 text-[13px] text-red-300">{error || loadError}</p>
        )}
        {loading ? (
          <SectionLoader text="Loading requests waiting on you" />
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] bg-[#111114]">
            <EmptyState title="All caught up" body="Nothing is waiting on you. New requests show up here and in your inbox." seed="all caught up" />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false} mode="popLayout">
              {requests.map((r) => (
                <QueueCard
                  key={r.id}
                  r={r}
                  balance={balances[r.requester_id]}
                  busy={busyId === r.id}
                  onApprove={() => decide(r.id, 'approve')}
                  onEdit={() => setEditing(r)}
                  onReject={() => setRejecting(r)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </PageBody>

      <RejectModal
        target={rejecting}
        onClose={() => setRejecting(null)}
        onConfirm={async (reason) => {
          const err = await decide(rejecting!.id, 'reject', { comment: reason });
          if (!err) setRejecting(null);
          return err;
        }}
      />
      <EditModal
        target={editing}
        approveLabel={editing?.status === 'pending_em_review' ? 'Confirm' : 'Approve'}
        onClose={() => setEditing(null)}
        onConfirm={async (startDate, endDate, comment) => {
          const err = await decide(editing!.id, 'approve', { startDate, endDate, comment });
          if (!err) setEditing(null);
          return err;
        }}
      />
    </>
  );
}

export default function QueueView(props: Parameters<typeof Queue>[0]) {
  return (
    <AppShell>
      <Queue {...props} />
    </AppShell>
  );
}

