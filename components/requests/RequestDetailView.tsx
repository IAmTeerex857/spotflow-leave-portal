'use client';
import { useState, type ReactNode } from 'react';
import { format } from 'date-fns';
import { Ban, CalendarX2, CheckCircle2, Clock, FileText, MapPin, ShieldCheck, Thermometer, User, Users, XCircle } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader, { PageBody } from '@/components/layout/PageHeader';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import { EmptyState, SectionLoader } from '@/components/ui/States';
import { formatDate, leaveTypeLabel, type LeaveStatus } from '@/lib/leave';
import { roleLabel, teamLabel } from '@/lib/roles';

export interface RequestDetail {
  id: string;
  requester_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  reason: string;
  cover_notes: string | null;
  cover_person_email: string | null;
  status: LeaveStatus;
  created_at: string;
  actioned_at: string | null;
  line_manager_actioned_at: string | null;
  cancelled_at: string | null;
  approver_comment: string | null;
  requester: { full_name: string; team: string; role: string };
  approver: { full_name: string } | null;
  line_manager: { full_name: string } | null;
}

const TYPE_ICON: Record<string, typeof MapPin> = { annual: MapPin, sick: Thermometer, personal: User, other: FileText };
const stamp = (ts: string) => format(new Date(ts), 'd MMM yyyy, HH:mm');

interface Step {
  icon: typeof Clock;
  label: string;
  time: string;
  tone: 'done' | 'waiting' | 'good' | 'bad' | 'muted';
  comment?: string | null;
}

/** Every stage the request has been through, plus what it is waiting on. */
function buildTimeline(r: RequestDetail): Step[] {
  const steps: Step[] = [{ icon: FileText, label: 'Submitted', time: stamp(r.created_at), tone: 'done' }];

  if (r.line_manager_actioned_at) {
    steps.push({
      icon: CheckCircle2,
      label: `Approved by ${r.line_manager?.full_name ?? 'line manager'}`,
      time: stamp(r.line_manager_actioned_at),
      tone: 'done',
      comment: r.status === 'pending_em_review' ? r.approver_comment : null,
    });
  }

  const by = r.approver ? ` by ${r.approver.full_name}` : '';
  const decided = r.actioned_at && r.status !== 'pending_em_review';

  if (r.status === 'pending') {
    steps.push({ icon: Clock, label: 'Waiting for approval', time: 'With your manager', tone: 'waiting' });
  } else if (r.status === 'pending_em_review') {
    steps.push({ icon: ShieldCheck, label: 'Waiting for the Engineering Manager', time: 'Final check', tone: 'waiting' });
  } else if (r.status === 'approved' && decided) {
    steps.push({ icon: CheckCircle2, label: `Approved${by}`, time: stamp(r.actioned_at!), tone: 'good', comment: r.approver_comment });
  } else if (r.status === 'rejected' && decided) {
    const verb = r.line_manager_actioned_at ? 'Overridden' : 'Rejected';
    steps.push({ icon: XCircle, label: `${verb}${by}`, time: stamp(r.actioned_at!), tone: 'bad', comment: r.approver_comment });
  } else if (r.status === 'cancelled') {
    if (r.actioned_at && r.approver) {
      steps.push({ icon: CheckCircle2, label: `Approved${by}`, time: stamp(r.actioned_at), tone: 'done' });
    }
    steps.push({ icon: Ban, label: 'Cancelled', time: r.cancelled_at ? stamp(r.cancelled_at) : '', tone: 'muted' });
  }
  return steps;
}

const TONE: Record<Step['tone'], string> = {
  done: 'border-white/10 bg-white/[0.04] text-zinc-300',
  waiting: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  good: 'border-[#3ddc97]/35 bg-[#3ddc97]/10 text-[#3ddc97]',
  bad: 'border-red-400/30 bg-red-500/10 text-red-300',
  muted: 'border-white/10 bg-white/[0.03] text-zinc-500',
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-t border-white/[0.05] py-4 first:border-t-0 sm:grid-cols-[150px_1fr] sm:gap-4">
      <dt className="text-[12px] font-medium text-zinc-500">{label}</dt>
      <dd className="text-[14px] leading-relaxed text-zinc-200">{children}</dd>
    </div>
  );
}

export default function RequestDetailView({ request, loading, isOwner, canCancel, onCancel }: {
  request: RequestDetail | null;
  loading: boolean;
  isOwner: boolean;
  canCancel: boolean;
  onCancel: () => Promise<string | null>;
}) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const back = { href: isOwner ? '/dashboard' : '/manager/history', label: 'Back' };

  if (loading || !request) {
    return (
      <AppShell>
        <PageHeader title="Leave request" back={back} />
        <PageBody>
          {loading ? (
            <SectionLoader text="Loading request" />
          ) : (
            <EmptyState title="Request not found" body="It may have been deleted, or you don’t have access to it." seed="not found" />
          )}
        </PageBody>
      </AppShell>
    );
  }

  const r = request;
  const Icon = TYPE_ICON[r.leave_type] ?? FileText;
  const range = r.start_date === r.end_date
    ? formatDate(r.start_date, 'EEEE d MMMM yyyy')
    : `${formatDate(r.start_date, 'EEE d MMM')} – ${formatDate(r.end_date, 'EEE d MMM yyyy')}`;

  const runCancel = async () => {
    setBusy(true);
    const err = await onCancel();
    setBusy(false);
    if (err) setError(err); else setConfirm(false);
  };

  return (
    <AppShell>
      <PageHeader
        title="Leave request"
        subtitle={`Submitted ${stamp(r.created_at)}`}
        back={back}
        actions={canCancel && (
          <Button variant="danger" size="sm" icon={<Ban className="h-3.5 w-3.5" />} hoverIcon={<CalendarX2 />} onClick={() => setConfirm(true)}>Cancel leave</Button>
        )}
      />
      <PageBody>
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_300px]">
          <section className="rounded-2xl border border-white/[0.06] bg-[#111114]">
            <div className="flex items-start gap-4 border-b border-white/[0.06] p-5 sm:p-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.03] text-zinc-300">
                <Icon className="h-5 w-5" strokeWidth={1.6} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[18px] font-semibold tracking-tight text-zinc-100">{leaveTypeLabel(r.leave_type)}</h2>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-1 text-[13px] text-zinc-500">{range} · {r.duration_days} working day{r.duration_days === 1 ? '' : 's'}</p>
              </div>
            </div>
            <dl className="px-5 sm:px-6">
              <Field label="Requested by">
                <span className="flex items-center gap-2.5">
                  <Avatar name={r.requester.full_name} size={26} />
                  <span>
                    {r.requester.full_name}
                    <span className="ml-2 text-[12px] text-zinc-500">{teamLabel(r.requester.team)} · {roleLabel(r.requester.role)}</span>
                  </span>
                </span>
              </Field>
              <Field label="Reason"><span className="whitespace-pre-wrap">{r.reason}</span></Field>
              {r.cover_person_email && <Field label="Cover">{r.cover_person_email}</Field>}
              {r.cover_notes && <Field label="Handover notes"><span className="whitespace-pre-wrap">{r.cover_notes}</span></Field>}
              {r.status === 'rejected' && r.approver_comment && (
                <Field label="Reason given">
                  <span className="block rounded-lg border border-red-400/20 bg-red-500/[0.06] px-3 py-2 text-red-200/90">{r.approver_comment}</span>
                </Field>
              )}
            </dl>
          </section>

          <section className="rounded-2xl border border-white/[0.06] bg-[#111114] p-5">
            <h2 className="flex items-center gap-2 text-[12px] font-medium text-zinc-500"><Users className="h-3.5 w-3.5" /> Progress</h2>
            <ol className="mt-4">
              {buildTimeline(r).map((s, i, all) => {
                const StepIcon = s.icon;
                return (
                  <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
                    {i < all.length - 1 && <span className="absolute left-[13px] top-7 bottom-0 w-px bg-white/[0.08]" aria-hidden="true" />}
                    <span className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${TONE[s.tone]}`}>
                      <StepIcon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[13px] font-medium text-zinc-200">{s.label}</p>
                      {s.time && <p className="text-[12px] text-zinc-500">{s.time}</p>}
                      {s.comment && <p className="mt-1.5 rounded-lg bg-white/[0.03] px-2.5 py-1.5 text-[12px] italic text-zinc-400">“{s.comment}”</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>
      </PageBody>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Cancel this leave?"
        description={`${leaveTypeLabel(r.leave_type)} · ${range}`}
        size="sm"
      >
        <p className="text-[13px] leading-relaxed text-zinc-400">
          It stays on record as cancelled, the days go back to your balance, and the calendar event is removed. Your approver is notified.
        </p>
        {error && <p className="mt-3 text-[13px] text-red-300">{error}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setConfirm(false)}>Keep it</Button>
          <Button variant="danger" onClick={runCancel} loading={busy} icon={<Ban className="h-3.5 w-3.5" />} hoverIcon={<CalendarX2 />}>Cancel leave</Button>
        </div>
      </Modal>
    </AppShell>
  );
}

