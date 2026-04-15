import { Clock, CheckCircle, XCircle } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number;
  type: 'pending' | 'approved' | 'rejected';
}

const config = {
  pending: { color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)', icon: <Clock size={18} /> },
  approved: { color: '#22C55E', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.18)', icon: <CheckCircle size={18} /> },
  rejected: { color: '#EF4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.18)', icon: <XCircle size={18} /> },
};

export default function StatCard({ label, value, type }: StatCardProps) {
  const { color, bg, border, icon } = config[type];
  return (
    <div
      className="stat-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
        <span style={{ color, background: bg, border: `1px solid ${border}`, padding: '6px', borderRadius: '8px', display: 'flex' }}>
          {icon}
        </span>
      </div>
      <p style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
        {value}
      </p>
    </div>
  );
}
