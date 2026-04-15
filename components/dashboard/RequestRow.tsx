import Link from 'next/link';
import StatusBadge from '@/components/ui/StatusBadge';
import { ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export interface LeaveRequest {
  id: string;
  leaveType: 'annual' | 'sick' | 'personal' | 'other';
  startDate: string;
  endDate: string;
  durationDays: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
}

const leaveTypeLabel: Record<string, string> = {
  annual: 'Annual Leave',
  sick: 'Sick Leave',
  personal: 'Personal',
  other: 'Other',
};

export default function RequestRow({ request }: { request: LeaveRequest }) {
  return (
    <tr>
      <td>
        <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '13px' }}>
          {leaveTypeLabel[request.leaveType]}
        </span>
      </td>
      <td style={{ fontSize: '13px' }}>
        {format(new Date(request.startDate), 'dd MMM yyyy')} — {format(new Date(request.endDate), 'dd MMM yyyy')}
      </td>
      <td style={{ fontSize: '13px' }}>
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{request.durationDays}</span>
        <span style={{ color: 'var(--text-muted)' }}> days</span>
      </td>
      <td><StatusBadge status={request.status} /></td>
      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
        {format(new Date(request.createdAt), 'dd MMM yyyy')}
      </td>
      <td>
        <Link
          href={`/requests/${request.id}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}
        >
          View <ChevronRight size={13} />
        </Link>
      </td>
    </tr>
  );
}
