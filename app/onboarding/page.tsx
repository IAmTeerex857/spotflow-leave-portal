'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Users } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';

const TEAMS = [
  { value: 'backend', label: 'Backend Engineering' },
  { value: 'frontend', label: 'Frontend Engineering' },
  { value: 'product', label: 'Product' },
  { value: 'design', label: 'Design' },
  { value: 'operations', label: 'Operations' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [team, setTeam] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!team) return;
    setSaving(true);
    setError('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ team })
      .eq('id', user.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Glow */}
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '500px', height: '400px', background: 'radial-gradient(ellipse, rgba(108,99,255,0.1) 0%, transparent 65%)', pointerEvents: 'none' }} />

      <div className="fade-in" style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', justifyContent: 'center', marginBottom: '28px' }}>
          <svg width="26" height="26" viewBox="0 0 26 24" fill="none">
            <path d="M14.1074 0.0237318C7.36969 -0.407113 1.09754 5.08006 0.113168 12.2771C-0.871208 19.4741 4.35923 24.6984 11.7632 23.9288C19.1672 23.1593 25.453 17.6531 25.7588 11.6511C26.0646 5.6491 20.8506 0.445092 14.1074 0.0237318ZM21.753 11.7039L19.432 13.9964C19.3083 14.1207 19.156 14.2134 18.9883 14.2668C18.8206 14.3201 18.6424 14.3323 18.4688 14.3025C18.2953 14.2727 18.1316 14.2017 17.9917 14.0956C17.8518 13.9894 17.7398 13.8512 17.6654 13.6929L14.0596 6.07452C13.3128 6.31027 13.1927 6.93485 13.6173 7.86158L17.2353 15.6642C17.4754 16.1321 17.5704 16.6602 17.5084 17.1816C17.4401 17.603 17.2203 18.0745 16.7779 18.1585C15.4372 18.4796 14.0951 18.7831 12.753 19.1069C12.7025 19.1245 12.6343 19.1245 12.5837 19.1408C12.1073 19.2586 11.6158 19.3426 11.1229 19.4266C10.6805 19.512 10.2737 19.512 9.93371 19.1746L4.09299 13.3555C3.99144 13.2549 3.91088 13.1353 3.85591 13.0037C3.80095 12.8722 3.77266 12.7311 3.77266 12.5887C3.77266 12.4462 3.80095 12.3052 3.85591 12.1736C3.91088 12.042 3.99144 11.9225 4.09299 11.8218L6.85498 9.07688C6.98024 8.95177 7.13458 8.85913 7.3044 8.80713C7.47423 8.75513 7.65433 8.74537 7.82885 8.77869C8.00338 8.81202 8.16697 8.88741 8.30522 8.99824C8.44347 9.10907 8.55214 9.25193 8.62167 9.41424C8.62167 9.41424 12.6807 18.4986 12.6807 18.5324C13.5135 18.1951 13.6664 17.5041 13.1736 16.4432C13.1736 16.4432 9.35073 8.1339 9.33571 8.11629C9.16505 7.70983 8.97801 7.25731 9.06266 6.80208C9.09513 6.56488 9.21592 6.34834 9.40125 6.1951C9.52567 6.10113 9.67236 6.04047 9.82722 6.01897C10.4143 5.916 11.0178 5.88349 11.6117 5.83065C11.897 5.80355 12.181 5.77239 12.4663 5.73716C12.992 5.67077 13.5012 5.61929 14.0282 5.55155C14.487 5.50142 14.9839 5.3998 15.455 5.41606C15.8454 5.44993 16.1513 5.75342 16.4229 5.98916C16.7629 6.29265 17.137 6.56227 17.4933 6.84814C18.4108 7.55673 19.3269 8.26397 20.2444 8.98882C20.7195 9.34243 21.1783 9.71367 21.6547 10.0849C21.7761 10.1797 21.8758 10.299 21.9473 10.4349C22.0187 10.5707 22.0604 10.7201 22.0694 10.8731C22.0784 11.0261 22.0547 11.1793 21.9997 11.3225C21.9447 11.4657 21.8597 11.5957 21.7503 11.7039H21.753Z" fill="#F4F4F5"/>
          </svg>
          <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Spotflow</span>
        </div>

        <div className="glass-card" style={{ padding: '32px' }}>
          <div style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              One last step
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Which team are you on? This helps route your leave requests to the right manager.
            </p>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '9px', padding: '10px 13px', marginBottom: '16px' }}>
              <p style={{ fontSize: '13px', color: '#EF4444' }}>{error}</p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {TEAMS.map(t => (
              <button
                key={t.value}
                onClick={() => setTeam(t.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '14px 16px',
                  background: team === t.value ? 'rgba(255,255,255,0.07)' : 'var(--bg-elevated)',
                  border: `1px solid ${team === t.value ? 'rgba(255,255,255,0.2)' : 'var(--border)'}`,
                  borderRadius: '10px', cursor: 'pointer',
                  fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)',
                  textAlign: 'left', transition: 'all 0.12s ease',
                }}
              >
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                  background: team === t.value ? '#F4F4F5' : 'var(--border-strong)',
                  transition: 'background 0.12s ease',
                }} />
                {t.label}
              </button>
            ))}
          </div>

          <button
            id="onboarding-save"
            onClick={handleSave}
            disabled={!team || saving}
            className="btn btn-primary"
            style={{ width: '100%', padding: '12px', opacity: !team || saving ? 0.5 : 1 }}
          >
            {saving ? 'Saving…' : 'Get started'}
          </button>
        </div>
      </div>
    </main>
  );
}
