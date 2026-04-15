'use client';
import AppShell from '@/components/layout/AppShell';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Shield, Save, CheckCircle } from 'lucide-react';

type Role = 'engineer' | 'line_manager' | 'engineering_manager' | 'head_of_product';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  team: string;
  role: Role;
  is_admin: boolean;
}

const ROLES: { value: Role; label: string }[] = [
  { value: 'engineer', label: 'Engineer' },
  { value: 'line_manager', label: 'Line Manager' },
  { value: 'engineering_manager', label: 'Engineering Manager' },
  { value: 'head_of_product', label: 'Head of Product' },
];

const teamLabel = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pendingRoles, setPendingRoles] = useState<Record<string, Role>>({});

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, team, role, is_admin')
      .order('full_name');
    if (data) {
      setProfiles(data as Profile[]);
      const initial: Record<string, Role> = {};
      (data as Profile[]).forEach(p => { initial[p.id] = p.role; });
      setPendingRoles(initial);
    }
    setLoading(false);
  };

  const handleRoleChange = (id: string, role: Role) => {
    setPendingRoles(prev => ({ ...prev, [id]: role }));
  };

  const handleSave = async (profile: Profile) => {
    setSaving(profile.id);
    const supabase = createClient();
    await supabase
      .from('profiles')
      .update({ role: pendingRoles[profile.id] })
      .eq('id', profile.id);

    // Update local state
    setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, role: pendingRoles[profile.id] } : p));
    setSaving(null);
    setSaved(profile.id);
    setTimeout(() => setSaved(null), 2000);
  };

  const hasChanged = (id: string, currentRole: Role) => pendingRoles[id] !== currentRole;

  return (
    <AppShell>
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={15} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Admin — Role Management</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>Assign roles to team members</p>
          </div>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '999px', padding: '4px 12px' }}>
          {profiles.length} members
        </span>
      </header>

      <div className="page-content fade-in">

        {/* Info callout */}
        <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <Shield size={14} style={{ color: 'var(--text-muted)', marginTop: '1px', flexShrink: 0 }} />
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Role changes take effect immediately. Engineers see the dashboard, manager roles see the request queue and history. Only one Engineering Manager and one Head of Product should exist at a time.
          </p>
        </div>

        {/* Table */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 120px 2fr 100px', padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
            {['Member', 'Email', 'Team', 'Role', ''].map(col => (
              <span key={col} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {col}
              </span>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading…</div>
          ) : (
            profiles.map((profile, i) => (
              <div
                key={profile.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 2fr 120px 2fr 100px',
                  padding: '14px 20px',
                  borderBottom: i < profiles.length - 1 ? '1px solid var(--border)' : 'none',
                  alignItems: 'center',
                  transition: 'background 0.12s ease',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                {/* Member */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>
                    {profile.full_name.charAt(0)}
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {profile.full_name}
                      {profile.is_admin && (
                        <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: '4px', padding: '1px 5px', letterSpacing: '0.05em' }}>
                          ADMIN
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Email */}
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px' }}>
                  {profile.email}
                </span>

                {/* Team */}
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {teamLabel(profile.team)}
                </span>

                {/* Role dropdown */}
                <div style={{ paddingRight: '12px' }}>
                  <select
                    className="form-input"
                    value={pendingRoles[profile.id] ?? profile.role}
                    onChange={e => handleRoleChange(profile.id, e.target.value as Role)}
                    style={{ fontSize: '13px', padding: '7px 32px 7px 10px' }}
                  >
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {/* Save button */}
                <div>
                  {saved === profile.id ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#22C55E', fontWeight: 500 }}>
                      <CheckCircle size={13} /> Saved
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSave(profile)}
                      disabled={!hasChanged(profile.id, profile.role) || saving === profile.id}
                      className="btn btn-ghost"
                      style={{
                        fontSize: '12px',
                        padding: '6px 14px',
                        opacity: hasChanged(profile.id, profile.role) ? 1 : 0.35,
                        cursor: hasChanged(profile.id, profile.role) ? 'pointer' : 'default',
                      }}
                    >
                      {saving === profile.id ? 'Saving…' : <><Save size={12} /> Save</>}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
