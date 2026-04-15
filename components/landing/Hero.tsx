'use client';
import Link from 'next/link';
import { ArrowRight, CalendarCheck, ShieldCheck, Clock } from 'lucide-react';

export default function Hero() {
  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: '0 24px',
      }}
    >
      {/* Background glow blobs */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '700px',
          height: '500px',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      {/* Subtle grid overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 0%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <div
        className="fade-in"
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          maxWidth: '680px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '28px',
        }}
      >
        {/* Pill tag */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-strong)',
            borderRadius: '999px',
            padding: '5px 14px',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--text-muted)',
            letterSpacing: '0.02em',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--text-muted)',
              display: 'inline-block',
            }}
          />
          Internal tool — Spotflow Engineering
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 'clamp(40px, 6vw, 72px)',
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
          }}
        >
          Leave,{' '}
          <span style={{ color: 'var(--text-primary)' }}>managed</span>
          <br />
          simply.
        </h1>

        {/* Subtext */}
        <p
          style={{
            fontSize: '17px',
            lineHeight: 1.65,
            color: 'var(--text-muted)',
            maxWidth: '480px',
          }}
        >
          A structured, auditable workflow for requesting, reviewing, and approving
          leave across the engineering organisation.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/signup" className="btn btn-primary btn-lg">
            Request access
            <ArrowRight size={16} />
          </Link>
          <Link href="/login" className="btn btn-ghost btn-lg">
            Log in to portal
          </Link>
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            marginTop: '8px',
          }}
        >
          {[
            { icon: <CalendarCheck size={13} />, label: 'Leave tracking' },
            { icon: <ShieldCheck size={13} />, label: 'Role-based access' },
            { icon: <Clock size={13} />, label: 'Email notifications' },
          ].map((item) => (
            <span
              key={item.label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                color: 'var(--text-muted)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '999px',
                padding: '5px 12px',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>{item.icon}</span>
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom fade */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '120px',
          background: 'linear-gradient(to top, var(--bg-base), transparent)',
          pointerEvents: 'none',
        }}
      />
    </section>
  );
}
