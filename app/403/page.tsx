import Link from 'next/link';
import { ShieldOff } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ShieldOff size={30} style={{ color: '#EF4444' }} />
        </div>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Access denied</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '320px' }}>
            You don&apos;t have permission to view this page. Contact your admin if you think this is a mistake.
          </p>
        </div>
        <Link href="/dashboard" className="btn btn-ghost">Back to dashboard</Link>
      </div>
    </main>
  );
}
