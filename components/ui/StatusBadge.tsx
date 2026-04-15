type Status = 'pending' | 'approved' | 'rejected' | 'cancelled';

const labelMap: Record<Status, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`badge badge-${status}`} aria-label={`Status: ${labelMap[status]}`}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
      {labelMap[status]}
    </span>
  );
}
