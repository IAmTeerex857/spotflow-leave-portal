import Link from 'next/link';
import { SpotflowLogo } from '@/components/brand/SpotflowLogo';

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] px-4 py-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 text-[13px] text-zinc-500">
        <span className="flex items-center gap-2">
          <SpotflowLogo size={16} color="#71717a" />
          © {new Date().getFullYear()} Spotflow · Leave Portal
        </span>
        <Link href="/login" className="transition-colors hover:text-zinc-200">Sign in</Link>
      </div>
    </footer>
  );
}
