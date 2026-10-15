'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, History, Inbox, LayoutDashboard, LogOut, Plus, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isManager, roleLabel, teamLabel } from '@/lib/roles';
import { SpotflowLogo } from '@/components/brand/SpotflowLogo';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useProfile } from './ProfileContext';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
  exact?: boolean;
}

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#3ddc97]/60 ${
        active ? 'text-zinc-100' : 'text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-200'
      }`}
    >
      {active && (
        <motion.span
          layoutId={onNavigate ? 'drawer-active' : 'sidebar-active'}
          className="absolute inset-0 rounded-lg bg-white/[0.06]"
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />
      )}
      <Icon className="relative h-4 w-4" strokeWidth={1.8} />
      <span className="relative flex-1">{item.label}</span>
      {!!item.badge && (
        <span className="relative rounded-full bg-[#3ddc97]/15 px-1.5 py-px text-[11px] font-semibold text-[#3ddc97]">{item.badge}</span>
      )}
    </Link>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="px-2.5 pb-1.5 text-[11px] font-medium text-zinc-600">{label}</p>
      {children}
    </div>
  );
}

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, queueCount } = useProfile();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

  const mine: NavItem[] = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/requests/new', label: 'New request', icon: Plus, exact: true },
    { href: '/calendar', label: 'Team calendar', icon: CalendarDays },
  ];
  const team: NavItem[] = [
    { href: '/manager/queue', label: 'Approvals', icon: Inbox, badge: queueCount },
    { href: '/manager/history', label: 'History', icon: History },
  ];

  const signOut = async () => {
    setSigningOut(true);
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="flex h-full flex-col gap-6 px-3 py-4">
      <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-[#3ddc97]/60">
        <SpotflowLogo size={22} />
        <span className="text-[15px] font-semibold tracking-tight text-zinc-100">Spotflow</span>
        <span className="rounded-md border border-white/[0.07] px-1.5 py-px text-[10px] font-medium text-zinc-500">Leave</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-6" aria-label="Main">
        <Section label="My leave">
          {mine.map((item) => <NavLink key={item.href} item={item} active={isActive(item)} onNavigate={onNavigate} />)}
        </Section>
        {profile && isManager(profile.role) && (
          <Section label="Team">
            {team.map((item) => <NavLink key={item.href} item={item} active={isActive(item)} onNavigate={onNavigate} />)}
          </Section>
        )}
        {profile?.is_admin && (
          <Section label="Admin">
            <NavLink item={{ href: '/admin', label: 'People & balances', icon: Users }} active={pathname.startsWith('/admin')} onNavigate={onNavigate} />
          </Section>
        )}
      </nav>

      <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
        <Avatar name={profile?.full_name ?? ''} size={34} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-zinc-100">{profile?.full_name ?? ' '}</p>
          <p className="truncate text-[11px] text-zinc-500">
            {profile ? (profile.role === 'engineer' ? teamLabel(profile.team) : roleLabel(profile.role)) : ' '}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConfirmLogout(true)}
          aria-label="Sign out"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 outline-none transition-colors hover:bg-white/[0.05] hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-[#3ddc97]/60"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <Modal open={confirmLogout} onClose={() => setConfirmLogout(false)} title="Sign out?" description="You'll go back to the sign-in page." size="sm">
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setConfirmLogout(false)}>Stay</Button>
          <Button variant="primary" onClick={signOut} loading={signingOut} icon={<LogOut className="h-3.5 w-3.5" />} arrow>Sign out</Button>
        </div>
      </Modal>
    </div>
  );
}
