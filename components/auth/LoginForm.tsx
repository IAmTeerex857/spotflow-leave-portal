'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const form = e.currentTarget;
    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Error message */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '9px', padding: '10px 13px' }}>
            <p style={{ fontSize: '13px', color: '#EF4444' }}>{error}</p>
          </div>
        )}

        {/* Email */}
        <div className="form-group">
          <label className="form-label" htmlFor="email">Work email</label>
          <div style={{ position: 'relative' }}>
            <Mail size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input id="email" name="email" type="email" className="form-input" placeholder="you@spotflow.com" style={{ paddingLeft: '38px' }} autoComplete="off" required />
          </div>
        </div>

        {/* Password */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label" htmlFor="password">Password</label>
            <Link href="/forgot-password" style={{ fontSize: '12px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
              Forgot password?
            </Link>
          </div>
          <div style={{ position: 'relative' }}>
            <Lock size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="••••••••"
              style={{ paddingLeft: '38px', paddingRight: '42px' }}
              autoComplete="current-password"
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          id="login-submit"
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', marginTop: '4px', opacity: loading ? 0.7 : 1 }}
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
        Don&apos;t have an account?{' '}
        <Link href="/signup" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>
          Sign up
        </Link>
      </p>
    </div>
  );
}
