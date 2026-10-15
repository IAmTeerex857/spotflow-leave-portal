import type { LeaveStatus } from '@/lib/leave';

const STYLES: Record<LeaveStatus, { label: string; className: string; dot: string }> = {
  pending: { label: 'Pending', className: 'border-amber-400/20 bg-amber-400/[0.08] text-amber-300', dot: 'bg-amber-400' },
  pending_em_review: { label: 'EM review', className: 'border-violet-400/20 bg-violet-400/[0.08] text-violet-300', dot: 'bg-violet-400' },
  approved: { label: 'Approved', className: 'border-[#3ddc97]/25 bg-[#3ddc97]/[0.08] text-[#3ddc97]', dot: 'bg-[#3ddc97]' },
  rejected: { label: 'Rejected', className: 'border-red-400/20 bg-red-400/[0.08] text-red-300', dot: 'bg-red-400' },
  cancelled: { label: 'Cancelled', className: 'border-white/[0.08] bg-white/[0.03] text-zinc-400', dot: 'bg-zinc-500' },
};

export default function StatusBadge({ status }: { status: LeaveStatus }) {
  const s = STYLES[status] ?? STYLES.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${s.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      {s.label}
    </span>
  );
}
