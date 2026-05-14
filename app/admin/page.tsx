'use client';
import AppShell from '@/components/layout/AppShell';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Shield, Save, CheckCircle } from 'lucide-react';
import { getAllLeaveBalances } from '@/lib/leave-balance';

type Role =
  | 'engineer'
  | 'frontend_engineer'
  | 'backend_engineer'
  | 'qa_engineer'
  | 'operations'
  | 'marketing'
  | 'product_designer'
  | 'product_manager'
  | 'frontend_line_manager'
  | 'backend_line_manager'
  | 'engineering_manager'
  | 'head_of_product'
  | 'head_of_operations'
  | 'line_manager';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  team: string;
  role: Role;
  is_admin: boolean;
}

interface BalanceRow {
  id: string;
  full_name: string;
  team: string;
  role: string;
  used: number;
  pending: number;
  remaining: number;
  allowance: number;
  adjustment: number;
}

const ROLES: { value: Role; label: string }[] = [
  { value: 'frontend_engineer', label: 'Frontend Engineer' },
  { value: 'backend_engineer', label: 'Backend Engineer' },
  { value: 'qa_engineer', label: 'QA Engineer' },
  { value: 'operations', label: 'Operations' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'product_designer', label: 'Product Designer' },
  { value: 'product_manager', label: 'Product Manager' },
  { value: 'frontend_line_manager', label: 'Frontend Line Manager' },
  { value: 'backend_line_manager', label: 'Backend Line Manager' },
  { value: 'engineering_manager', label: 'Engineering Manager' },
  { value: 'head_of_product', label: 'Head of Product' },
  { value: 'head_of_operations', label: 'Head of Operations' },
  { value: 'engineer', label: 'Engineer (default)' },
];

const teamLabel = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : '—');
const roleLabel = (r: string) => ROLES.find(x => x.value === r)?.label ?? r;

type Tab = 'roles' | 'balances';

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('roles');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [balancesLoading, setBalancesLoading] = useState(false);

  // Role management state
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pendingRoles, setPendingRoles] = useState<Record<string, Role>>({});

  // Balance adjustment state
  const [pendingAdjustments, setPendingAdjustments] = useState<Record<string, number>>({});
  const [adjustmentSaving, setAdjustmentSaving] = useState<string | null>(null);
  const [adjustmentSaved, setAdjustmentSaved] = useState<string | null>(null);

  useEffect(() => { loadProfiles(); }, []);
  useEffect(() => {
    if (tab === 'balances' && balances.length === 0) loadBalances();
  }, [tab]);

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

  const loadBalances = async () => {
    setBalancesLoading(true);
    const data = await getAllLeaveBalances();
    const rows = data as BalanceRow[];
    setBalances(rows);
    const initial: Record<string, number> = {};
    rows.forEach(r => { initial[r.id] = r.adjustment ?? 0; });
    setPendingAdjustments(initial);
    setBalancesLoading(false);
  };

  const handleRoleChange = (id: string, role: Role) => {
    setPendingRoles(prev => ({ ...prev, [id]: role }));
  };

  const handleSave = async (profile: Profile) => {
    setSaving(profile.id);
    const supabase = createClient();
    await supabase.from('profiles').update({ role: pendingRoles[profile.id] }).eq('id', profile.id);
    setProfiles(prev => prev.map(p => p.id === profile.id ? { ...p, role: pendingRoles[profile.id] } : p));
    setSaving(null);
    setSaved(profile.id);
    setTimeout(() => setSaved(null), 2000);
  };

  const handleAdjustmentSave = async (row: BalanceRow) => {
    setAdjustmentSaving(row.id);
    const supabase = createClient();
    const newAdj = pendingAdjustments[row.id] ?? 0;
    await supabase.from('profiles').update({ leave_balance_adjustment: newAdj }).eq('id', row.id);
    // Update local balances to reflect new adjustment
    setBalances(prev => prev.map(b => {
      if (b.id !== row.id) return b;
      const effectiveAllowance = 20 + newAdj;
      return {
        ...b,
        adjustment: newAdj,
        allowance: effectiveAllowance,
        remaining: Math.max(0, effectiveAllowance - b.used),
      };
    }));
    setAdjustmentSaving(null);
    setAdjustmentSaved(row.id);
    setTimeout(() => setAdjustmentSaved(null), 2000);
  };

  const hasChanged = (id: string, currentRole: Role) => pendingRoles[id] !== currentRole;
  const adjustmentChanged = (row: BalanceRow) => (pendingAdjustments[row.id] ?? 0) !== (row.adjustment ?? 0);

  const AvatarCircle = ({ name, size = 32 }: { name: string; size?: number }) => (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size > 28 ? '14px' : '12px', fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0 }}>
      {name.charAt(0)}
    </div>
  );

  return (
    <AppShell>
      <header className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={15} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Admin</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>Manage roles and leave balances</p>
          </div>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '999px', padding: '4px 12px' }}>
          {profiles.length} members
        </span>
      </header>

      <div className="page-content fade-in">

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '3px', width: 'fit-content' }}>
          {(['roles', 'balances'] as Tab[]).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                background: tab === key ? 'var(--bg-surface)' : 'transparent',
                border: tab === key ? '1px solid var(--border-strong)' : '1px solid transparent',
                borderRadius: '8px', padding: '7px 16px', fontSize: '13px',
                fontWeight: tab === key ? 600 : 400,
                color: tab === key ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}
            >
              {key === 'roles' ? 'Role Management' : 'Leave Balances'}
            </button>
          ))}
        </div>

        {/* ── Role Management Tab ── */}
        {tab === 'roles' && (
          <>
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Shield size={14} style={{ color: 'var(--text-muted)', marginTop: '1px', flexShrink: 0 }} />
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Role changes take effect immediately. Line Managers see only their team's requests. Engineering Manager sees all engineering (frontend, backend, QA) requests. Head of Operations sees Operations and Marketing.
              </p>
            </div>

            {/* Desktop table */}
            <div className="glass-card admin-desktop-table" style={{ overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 120px 2fr 100px', padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
                {['Member', 'Email', 'Team', 'Role', ''].map(col => (
                  <span key={col} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col}</span>
                ))}
              </div>
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading…</div>
              ) : (
                profiles.map((profile, i) => (
                  <div key={profile.id}
                    style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 120px 2fr 100px', padding: '14px 20px', borderBottom: i < profiles.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center', transition: 'background 0.12s ease' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <AvatarCircle name={profile.full_name} size={32} />
                      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {profile.full_name}
                        {profile.is_admin && <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: '4px', padding: '1px 5px' }}>ADMIN</span>}
                      </p>
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px' }}>{profile.email}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{teamLabel(profile.team)}</span>
                    <div style={{ paddingRight: '12px' }}>
                      <select className="form-input" value={pendingRoles[profile.id] ?? profile.role} onChange={e => handleRoleChange(profile.id, e.target.value as Role)} style={{ fontSize: '13px', padding: '7px 32px 7px 10px' }}>
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </div>
                    <div>
                      {saved === profile.id ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#22C55E', fontWeight: 500 }}><CheckCircle size={13} /> Saved</span>
                      ) : (
                        <button onClick={() => handleSave(profile)} disabled={!hasChanged(profile.id, profile.role) || saving === profile.id} className="btn btn-ghost" style={{ fontSize: '12px', padding: '6px 14px', opacity: hasChanged(profile.id, profile.role) ? 1 : 0.35 }}>
                          {saving === profile.id ? 'Saving…' : <><Save size={12} /> Save</>}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Mobile cards */}
            <div className="admin-mobile-cards" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading…</div>
              ) : (
                profiles.map(profile => (
                  <div key={profile.id} className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AvatarCircle name={profile.full_name} size={36} />
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {profile.full_name}
                            {profile.is_admin && <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: '4px', padding: '1px 5px' }}>ADMIN</span>}
                          </p>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{profile.email}</p>
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '6px', padding: '3px 8px', flexShrink: 0 }}>{teamLabel(profile.team)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select className="form-input" value={pendingRoles[profile.id] ?? profile.role} onChange={e => handleRoleChange(profile.id, e.target.value as Role)} style={{ fontSize: '13px', flex: 1 }}>
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                      {saved === profile.id ? (
                        <span style={{ display: 'flex', alignItems: 'center', padding: '0 10px', color: '#22C55E' }}><CheckCircle size={16} /></span>
                      ) : (
                        <button onClick={() => handleSave(profile)} disabled={!hasChanged(profile.id, profile.role) || saving === profile.id} className="btn btn-ghost" style={{ fontSize: '13px', padding: '10px 16px', opacity: hasChanged(profile.id, profile.role) ? 1 : 0.35, flexShrink: 0 }}>
                          {saving === profile.id ? 'Saving…' : <><Save size={13} /> Save</>}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* ── Leave Balances Tab ── */}
        {tab === 'balances' && (
          <>
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Shield size={14} style={{ color: 'var(--text-muted)', marginTop: '1px', flexShrink: 0 }} />
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Use the <strong style={{ color: 'var(--text-secondary)' }}>Adjust</strong> column to grant extra days (positive) or deduct days (negative) from an employee's annual allowance. Base allowance is 20 days.
              </p>
            </div>

            {/* Desktop table */}
            <div className="glass-card admin-desktop-table" style={{ overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 70px 70px 70px 120px 110px', padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
                {['Member', 'Role', 'Used', 'Pending', 'Left', 'Adjust (days)', ''].map(col => (
                  <span key={col} style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{col}</span>
                ))}
              </div>
              {balancesLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading balances…</div>
              ) : (
                [...balances].sort((a, b) => a.remaining - b.remaining).map((b, i) => {
                  const effectiveAllowance = b.allowance ?? 20;
                  const pct = Math.min(100, Math.round((b.used / effectiveAllowance) * 100));
                  const low = b.remaining <= 5;
                  const currentAdj = pendingAdjustments[b.id] ?? 0;
                  return (
                    <div key={b.id}
                      style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 70px 70px 70px 120px 110px', padding: '14px 20px', borderBottom: i < balances.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center', transition: 'background 0.12s ease' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AvatarCircle name={b.full_name} size={28} />
                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{b.full_name}</span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{roleLabel(b.role)}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{b.used}d</span>
                      <span style={{ fontSize: '12px', color: '#F59E0B' }}>{b.pending > 0 ? `+${b.pending}d` : '—'}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: low ? '#EF4444' : '#22C55E' }}>{b.remaining}d</span>
                      {/* Adjustment input */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="number"
                          value={currentAdj}
                          onChange={e => setPendingAdjustments(prev => ({ ...prev, [b.id]: Number(e.target.value) }))}
                          className="form-input"
                          style={{ fontSize: '13px', padding: '6px 10px', width: '72px', textAlign: 'center' }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          = {effectiveAllowance + (currentAdj - (b.adjustment ?? 0))}d total
                        </span>
                      </div>
                      <div>
                        {adjustmentSaved === b.id ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#22C55E', fontWeight: 500 }}><CheckCircle size={13} /> Saved</span>
                        ) : (
                          <button
                            onClick={() => handleAdjustmentSave(b)}
                            disabled={!adjustmentChanged(b) || adjustmentSaving === b.id}
                            className="btn btn-ghost"
                            style={{ fontSize: '12px', padding: '6px 14px', opacity: adjustmentChanged(b) ? 1 : 0.35 }}
                          >
                            {adjustmentSaving === b.id ? 'Saving…' : <><Save size={12} /> Save</>}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Mobile cards */}
            <div className="admin-mobile-cards" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {balancesLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Loading balances…</div>
              ) : (
                [...balances].sort((a, b) => a.remaining - b.remaining).map(b => {
                  const effectiveAllowance = b.allowance ?? 20;
                  const pct = Math.min(100, Math.round((b.used / effectiveAllowance) * 100));
                  const low = b.remaining <= 5;
                  const currentAdj = pendingAdjustments[b.id] ?? 0;
                  return (
                    <div key={b.id} className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <AvatarCircle name={b.full_name} size={36} />
                          <div>
                            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{b.full_name}</p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'capitalize' }}>{roleLabel(b.role)}</p>
                          </div>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: low ? '#EF4444' : '#22C55E', flexShrink: 0 }}>{b.remaining}d left</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                        {[
                          { label: 'Used', value: `${b.used}d`, color: 'var(--text-primary)' },
                          { label: 'Pending', value: b.pending > 0 ? `${b.pending}d` : '—', color: '#F59E0B' },
                          { label: 'Remaining', value: `${b.remaining}d`, color: low ? '#EF4444' : '#22C55E' },
                        ].map((stat, idx) => (
                          <div key={stat.label} style={{ flex: 1, padding: '10px 8px', textAlign: 'center', borderRight: idx < 2 ? '1px solid var(--border)' : 'none', background: 'var(--bg-elevated)' }}>
                            <p style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '3px' }}>{stat.label}</p>
                            <p style={{ fontSize: '15px', fontWeight: 700, color: stat.color }}>{stat.value}</p>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div style={{ height: '6px', borderRadius: '99px', background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: '99px', width: `${pct}%`, background: pct >= 90 ? '#EF4444' : pct >= 70 ? '#F59E0B' : '#22C55E', transition: 'width 0.3s ease' }} />
                        </div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>{pct}% of {effectiveAllowance}d used</p>
                      </div>
                      {/* Adjustment */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Balance adjustment (days)</p>
                          <input
                            type="number"
                            value={currentAdj}
                            onChange={e => setPendingAdjustments(prev => ({ ...prev, [b.id]: Number(e.target.value) }))}
                            className="form-input"
                            style={{ fontSize: '14px', padding: '8px 12px', width: '100%', textAlign: 'center' }}
                          />
                          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Total allowance: <strong style={{ color: 'var(--text-secondary)' }}>{20 + currentAdj}d</strong>
                          </p>
                        </div>
                        <div style={{ paddingTop: '20px' }}>
                          {adjustmentSaved === b.id ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#22C55E', fontWeight: 500 }}><CheckCircle size={14} /> Saved</span>
                          ) : (
                            <button
                              onClick={() => handleAdjustmentSave(b)}
                              disabled={!adjustmentChanged(b) || adjustmentSaving === b.id}
                              className="btn btn-ghost"
                              style={{ fontSize: '13px', padding: '10px 16px', opacity: adjustmentChanged(b) ? 1 : 0.35 }}
                            >
                              {adjustmentSaving === b.id ? 'Saving…' : <><Save size={13} /> Save</>}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

      </div>
    </AppShell>
  );
}
