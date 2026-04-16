'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const TEAMS = [
  { value: 'backend', label: 'Backend' },
  { value: 'frontend', label: 'Frontend' },
  { value: 'product', label: 'Product' },
  { value: 'design', label: 'Design' },
];

export default function SignupForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const form = e.currentTarget;
    const fullName = (form.elements.namedItem('fullname') as HTMLInputElement).value;
    const email = (form.elements.namedItem('signup-email') as HTMLInputElement).value;
    const team = (form.elements.namedItem('team') as HTMLSelectElement).value;
    const password = (form.elements.namedItem('signup-password') as HTMLInputElement).value;

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // role defaults to 'engineer' via the DB trigger
        data: { full_name: fullName, team },
      },
    });

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
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '9px', padding: '10px 13px' }}>
            <p style={{ fontSize: '13px', color: '#EF4444' }}>{error}</p>
          </div>
        )}

        {/* Full name */}
        <div className="form-group">
          <label className="form-label" htmlFor="fullname">Full name</label>
          <div style={{ position: 'relative' }}>
            <User size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input id="fullname" name="fullname" type="text" className="form-input" placeholder="Ada Lovelace" style={{ paddingLeft: '38px' }} autoComplete="off" required />
          </div>
        </div>

        {/* Work email */}
        <div className="form-group">
          <label className="form-label" htmlFor="signup-email">Work email</label>
          <div style={{ position: 'relative' }}>
            <Mail size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input id="signup-email" name="signup-email" type="email" className="form-input" placeholder="you@spotflow.com" style={{ paddingLeft: '38px' }} autoComplete="off" required />
          </div>
        </div>

        {/* Team */}
        <div className="form-group">
          <label className="form-label" htmlFor="team">Team</label>
          <div style={{ position: 'relative' }}>
            <Users size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1 }} />
            <select id="team" name="team" className="form-input" style={{ paddingLeft: '38px' }} required>
              <option value="">Select your team…</option>
              {TEAMS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {/* Password */}
        <div className="form-group">
          <label className="form-label" htmlFor="signup-password">Password</label>
          <div style={{ position: 'relative' }}>
            <Lock size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              id="signup-password"
              name="signup-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Min. 8 characters"
              style={{ paddingLeft: '38px', paddingRight: '42px' }}
              autoComplete="new-password"
              required
              minLength={8}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          id="signup-submit"
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', marginTop: '4px', opacity: loading ? 0.7 : 1 }}
          disabled={loading}
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>
          Log in
        </Link>
      </p>
    </div>
  );
}
