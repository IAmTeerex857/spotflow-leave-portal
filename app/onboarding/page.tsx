'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Code2, Megaphone, Monitor, Palette, Server, Settings2, type LucideIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SpotflowLogo } from '@/components/brand/SpotflowLogo';
import Button from '@/components/ui/Button';
import { TEAMS } from '@/lib/roles';
import { errorMessage } from '@/lib/leave';

const TEAM_ICON: Record<string, LucideIcon> = {
  backend: Server,
  frontend: Monitor,
  product: Code2,
  design: Palette,
  operations: Settings2,
  marketing: Megaphone,
};

export default function OnboardingPage() {
  const router = useRouter();
  const [team, setTeam] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!team) return;
    setSaving(true);
    setError('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { error: updateError } = await supabase.from('profiles').update({ team }).eq('id', user.id);
    if (updateError) {
      setError(errorMessage(updateError));
      setSaving(false);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0c0c0e] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mx-auto mb-8 flex w-fit items-center gap-2.5">
          <SpotflowLogo size={26} />
          <span className="text-[16px] font-semibold tracking-tight text-zinc-100">Spotflow</span>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-[#111114] p-7">
          <p className="text-[12px] font-medium text-[#3ddc97]">One last step</p>
          <h1 className="mt-1.5 text-[20px] font-semibold tracking-tight text-zinc-100">Which team are you on?</h1>
          <p className="mt-1.5 text-[14px] text-zinc-500">This sends your requests to the right approver. Only an admin can change it later.</p>

          {error && <p role="alert" className="mt-5 rounded-lg border border-red-400/20 bg-red-500/[0.08] px-3 py-2.5 text-[13px] text-red-300">{error}</p>}

          <div className="mt-6 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Team">
            {TEAMS.map((t) => {
              const Icon = TEAM_ICON[t.value] ?? Settings2;
              const on = team === t.value;
              return (
                <motion.button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setTeam(t.value)}
                  className={`flex flex-col gap-2 rounded-xl border p-3.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#3ddc97]/60 ${
                    on ? 'border-[#3ddc97]/40 bg-[#3ddc97]/[0.06]' : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${on ? 'text-[#3ddc97]' : 'text-zinc-500'}`} strokeWidth={1.8} />
                  <span className={`text-[13px] font-medium ${on ? 'text-zinc-100' : 'text-zinc-400'}`}>{t.label}</span>
                </motion.button>
              );
            })}
          </div>

          <Button variant="primary" className="mt-6 w-full !h-10" disabled={!team} loading={saving} onClick={save} arrow>
            Continue
          </Button>
        </div>
      </div>
    </main>
  );
}
