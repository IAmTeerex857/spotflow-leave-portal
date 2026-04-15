import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <p style={{ fontSize: '100px', fontWeight: 800, color: 'var(--bg-elevated)', lineHeight: 1, letterSpacing: '-0.05em' }}>404</p>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>Page not found</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        </div>
        <Link href="/dashboard" className="btn btn-primary">Back to dashboard</Link>
      </div>
    </main>
  );
}
