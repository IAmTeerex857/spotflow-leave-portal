import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { SpotflowLogo } from '@/components/brand/SpotflowLogo';
import { SlideButton } from '@/components/ui/MotionButtons';

const LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#features', label: 'Features' },
];

export default function LandingNavbar() {
  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4">
      <nav className="mx-auto flex h-14 max-w-4xl items-center justify-between rounded-full border border-white/[0.07] bg-[#111114]/80 pl-5 pr-2.5 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#3ddc97]/70">
          <SpotflowLogo size={24} />
          <span className="text-[15px] font-semibold tracking-tight text-zinc-100">Spotflow</span>
        </Link>

        <div className="hidden items-center gap-5 sm:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-[13px] text-zinc-400 transition-colors hover:text-zinc-100">
              {l.label}
            </a>
          ))}
        </div>

        <SlideButton href="/login" label="Sign in" icon={<LogIn className="h-4 w-4" />} />
      </nav>
    </header>
  );
}
