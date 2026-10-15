'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getSiteUrl } from '@/lib/site-url';
import GoogleIcon from '@/components/ui/GoogleIcon';
import { TextLoader } from 'generative-loaders';
import 'generative-loaders/styles.css';


export default function LoginForm({ initialError = '' }: { initialError?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${getSiteUrl(window.location.origin)}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/calendar.events',
        queryParams: {
          // Pre-selects the work account in Google's picker. The domain is
          // enforced by the handle_new_user trigger, not by this hint.
          hd: 'spotflow.one',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
    // On success, browser is redirected by Supabase — no need to do anything
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '9px', padding: '10px 13px' }}>
          <p style={{ fontSize: '13px', color: '#EF4444' }}>{error}</p>
        </div>
      )}

      <button
        id="google-signin"
        onClick={handleGoogleSignIn}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          width: '100%', padding: '12px 20px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: '10px', cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)',
          transition: 'all 0.15s ease',
          opacity: loading ? 0.7 : 1,
        }}
        onMouseEnter={e => {
          if (!loading) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.25)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
        }}
      >
        <GoogleIcon />
        {loading
          ? <span style={{ display: 'inline-block' }}><TextLoader text="Redirecting to Google" variant="wave" color="currentColor" aria-label="Redirecting to Google" /></span>
          : 'Continue with Google'}
      </button>

      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
        Use your <strong style={{ color: 'var(--text-secondary)' }}>@spotflow.one</strong> work account to sign in.
      </p>
    </div>
  );
}
