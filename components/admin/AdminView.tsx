'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Minus, Pencil, Plus, Save, Search } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import PageHeader, { PageBody } from '@/components/layout/PageHeader';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { EmptyState, SectionLoader } from '@/components/ui/States';
import { inputClass, labelClass } from '@/components/ui/form';
import Picker from '@/components/ui/Picker';
import { ROLES, roleLabel, teamLabel } from '@/lib/roles';
import type { LeaveBalance } from '@/lib/leave-balance';

export interface AdminProfile {
  id: string;
  full_name: string;
  email: string;
  team: string;
  role: string;
  is_admin: boolean;
}

type Tab = 'people' | 'balances';

function RoleRow({ p, onSave }: { p: AdminProfile; onSave: (id: string, role: string) => Promise<string | null> }) {
  const [role, setRole] = useState(p.role);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => setRole(p.role), [p.role]);
  const changed = role !== p.role;

  const save = async () => {
    setSaving(true);
    setError('');
    const err = await onSave(p.id, role);
    setSaving(false);
    if (err) setError(err);
    else { setSaved(true); setTimeout(() => setSaved(false), 1800); }
  };

  return (
    <li className="grid grid-cols-[1fr_auto] items-start gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1.3fr)_160px_minmax(0,1fr)_88px] sm:items-center sm:gap-4 sm:px-5">
      <span className="col-span-2 flex min-w-0 items-center gap-3 sm:col-span-1">
        <Avatar name={p.full_name} size={34} />
        <span className="min-w-0">
          <span className="flex items-center gap-2 text-[14px] font-medium text-zinc-100">
            <span className="truncate">{p.full_name}</span>
            {p.is_admin && <span className="rounded border border-white/10 px-1 text-[10px] font-semibold text-zinc-400">ADMIN</span>}
          </span>
          <span className="block truncate text-[12px] text-zinc-500">{p.email}</span>
        </span>
      </span>
      <span className="hidden text-[13px] text-zinc-400 sm:block">{teamLabel(p.team)}</span>
      <div>
        <Picker value={role} onChange={setRole} options={ROLES} label={`Role for ${p.full_name}`} size="sm" />
        {error && <span className="mt-1 block text-[12px] text-red-300">{error}</span>}
      </div>
      <span className="flex justify-end">
        {saved ? (
          <span className="flex h-8 items-center gap-1 text-[12px] font-medium text-[#3ddc97]"><Check className="h-3.5 w-3.5" /> Saved</span>
        ) : (
          <Button size="sm" variant={changed ? 'primary' : 'secondary'} disabled={!changed} loading={saving} onClick={save} icon={<Save />} hoverIcon={<Check />}>Save</Button>
        )}
      </span>
    </li>
  );
}

function AdjustModal({ row, onClose, onSave }: {
  row: LeaveBalance | null;
  onClose: () => void;
  onSave: (id: string, adjustment: number) => Promise<string | null>;
}) {
  const [adj, setAdj] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (row) { setAdj(row.adjustment); setError(''); } }, [row]);
  const base = row ? row.allowance - row.adjustment : 20;

  const save = async () => {
    if (!row) return;
    setSaving(true);
    const err = await onSave(row.user_id, adj);
    setSaving(false);
    if (err) setError(err); else onClose();
  };

  return (
    <Modal open={!!row} onClose={onClose} title="Adjust allowance" description={row ? `${row.full_name} · ${roleLabel(row.role)}` : undefined} size="sm">
      <span className={labelClass}>Extra days (or fewer, if negative)</span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" aria-label="One day fewer" onClick={() => setAdj((a) => a - 1)} className="!px-2.5"><Minus className="h-4 w-4" /></Button>
        <input
          type="number"
          className={`${inputClass} text-center text-[18px] font-semibold`}
          value={adj}
          onChange={(e) => setAdj(Number(e.target.value) || 0)}
          aria-label="Adjustment in days"
        />
        <Button variant="secondary" aria-label="One day more" onClick={() => setAdj((a) => a + 1)} className="!px-2.5"><Plus className="h-4 w-4" /></Button>
      </div>
      <p className="mt-3 text-[13px] text-zinc-400">
        Total allowance: <span className="font-semibold text-zinc-100">{base + adj} days</span>
        <span className="text-zinc-600"> ({base} base {adj >= 0 ? '+' : '−'} {Math.abs(adj)})</span>
      </p>
      {error && <p className="mt-3 text-[13px] text-red-300">{error}</p>}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={save} loading={saving} icon={<Save />} hoverIcon={<Check />}>Save</Button>
      </div>
    </Modal>
  );
}

export default function AdminView({ profiles, loadingProfiles, balances, loadingBalances, onLoadBalances, onSaveRole, onSaveAdjustment, initialTab = 'people' }: {
  profiles: AdminProfile[];
  loadingProfiles: boolean;
  balances: LeaveBalance[];
  loadingBalances: boolean;
  onLoadBalances: () => void;
  onSaveRole: (id: string, role: string) => Promise<string | null>;
  onSaveAdjustment: (id: string, adjustment: number) => Promise<string | null>;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState('');
  const [adjusting, setAdjusting] = useState<LeaveBalance | null>(null);

  useEffect(() => { if (tab === 'balances') onLoadBalances(); }, [tab, onLoadBalances]);

  const q = query.trim().toLowerCase();
  const people = useMemo(
    () => profiles.filter((p) => !q || p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)),
    [profiles, q],
  );
  const rows = useMemo(
    () => balances.filter((b) => !q || b.full_name.toLowerCase().includes(q)).sort((a, b) => a.remaining - b.remaining),
    [balances, q],
  );

  return (
    <AppShell>
      <PageHeader title="People & balances" subtitle={`${profiles.length || '—'} people · role changes apply immediately`} />
      <PageBody>
        <section className="rounded-2xl border border-white/[0.06] bg-[#111114]">
          <div className="flex flex-col gap-3 border-b border-white/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex gap-0.5" role="tablist" aria-label="Admin sections">
              {(['people', 'balances'] as Tab[]).map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`relative rounded-full px-3.5 py-1.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#3ddc97]/60 ${tab === t ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  {tab === t && <motion.span layoutId="admin-tab" className="absolute inset-0 rounded-full bg-white/[0.07]" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                  <span className="relative">{t === 'people' ? 'People & roles' : 'Leave balances'}</span>
                </button>
              ))}
            </div>
            <label className="relative block sm:w-60">
              <span className="sr-only">Search people</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input className={`${inputClass} !py-2 pl-9`} placeholder="Search people" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
          </div>

          {tab === 'people' ? (
            loadingProfiles ? (
              <SectionLoader text="Loading people" />
            ) : people.length === 0 ? (
              <EmptyState title="No one found" body="Try a different name or email." seed="no people" />
            ) : (
              <ul className="divide-y divide-white/[0.05]">
                {people.map((p) => <RoleRow key={p.id} p={p} onSave={onSaveRole} />)}
              </ul>
            )
          ) : loadingBalances ? (
            <SectionLoader text="Working out balances" />
          ) : rows.length === 0 ? (
            <EmptyState title="No one found" body="Try a different name." seed="no balances" />
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {rows.map((b) => {
                const pct = (n: number) => `${Math.min(100, (n / Math.max(b.allowance, 1)) * 100)}%`;
                const low = b.remaining <= 5;
                return (
                  <li key={b.user_id} className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3.5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_120px_40px] sm:gap-5 sm:px-5">
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar name={b.full_name} size={32} />
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-medium text-zinc-100">{b.full_name}</span>
                        <span className="block truncate text-[12px] text-zinc-500">{roleLabel(b.role)}</span>
                      </span>
                    </span>
                    <span className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto">
                      <span className="flex h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                        <span className="h-full bg-[#3ddc97]" style={{ width: pct(b.used) }} />
                        <span className="h-full bg-violet-400/50" style={{ width: pct(b.pending) }} />
                      </span>
                      <span className="mt-1.5 block text-[11px] text-zinc-500">{b.used} used · {b.pending} pending</span>
                    </span>
                    <span className="text-right sm:text-left">
                      <span className={`block text-[14px] font-semibold ${low ? 'text-amber-300' : 'text-zinc-100'}`}>{b.remaining} left</span>
                      <span className="block text-[11px] text-zinc-500">
                        of {b.allowance}{b.adjustment !== 0 && <span className={b.adjustment > 0 ? 'text-[#3ddc97]' : 'text-red-300'}> ({b.adjustment > 0 ? '+' : ''}{b.adjustment})</span>}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setAdjusting(b)}
                      aria-label={`Adjust allowance for ${b.full_name}`}
                      className="row-start-1 col-start-2 hidden h-8 w-8 items-center justify-center justify-self-end rounded-lg text-zinc-500 outline-none hover:bg-white/[0.05] hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-[#3ddc97]/60 sm:col-start-auto sm:row-start-auto sm:flex"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => setAdjusting(b)} className="col-span-2 text-left text-[12px] font-medium text-zinc-400 sm:hidden">
                      Adjust allowance →
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </PageBody>

      <AdjustModal row={adjusting} onClose={() => setAdjusting(null)} onSave={onSaveAdjustment} />
    </AppShell>
  );
}
