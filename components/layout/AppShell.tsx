'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { SpotflowLogo } from '@/components/brand/SpotflowLogo';
import Sidebar from './Sidebar';
import { ProfileProvider } from './ProfileContext';

export default function AppShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setDrawerOpen(false), [pathname]);
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  return (
    <ProfileProvider>
      <div className="min-h-screen bg-[#0c0c0e]">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-white/[0.06] bg-[#0e0e10] md:block">
          <Sidebar />
        </aside>

        {/* Mobile top bar + drawer */}
        <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#0c0c0e]/90 px-3 backdrop-blur-xl md:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-300 hover:bg-white/[0.05]"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="flex items-center gap-2">
            <SpotflowLogo size={20} />
            <span className="text-[15px] font-semibold text-zinc-100">Spotflow</span>
          </span>
          <span className="w-9" />
        </div>
        <AnimatePresence>
          {drawerOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm md:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDrawerOpen(false)}
              />
              <motion.aside
                className="fixed inset-y-0 left-0 z-[210] w-72 border-r border-white/[0.06] bg-[#0e0e10] md:hidden"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 420, damping: 42 }}
                aria-label="Menu"
              >
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="absolute right-3 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-100"
                >
                  <X className="h-4 w-4" />
                </button>
                <Sidebar onNavigate={() => setDrawerOpen(false)} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main className="min-w-0 md:pl-60">{children}</main>
      </div>
    </ProfileProvider>
  );
}
