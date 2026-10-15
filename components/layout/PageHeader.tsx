import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';

/** Page title bar: sticky on desktop, with optional back link and actions. */
export default function PageHeader({ title, subtitle, actions, back, width = 'max-w-5xl' }: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  width?: string;
}) {
  return (
    <header className="z-30 border-b border-white/[0.06] bg-[#0c0c0e]/85 backdrop-blur-xl md:sticky md:top-0">
      <div className={`mx-auto flex min-h-16 ${width} flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8`}>
        <div className="flex min-w-0 items-center gap-3">
          {back && (
            <Link
              href={back.href}
              aria-label={back.label}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] text-zinc-400 outline-none transition-colors hover:bg-white/[0.05] hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-[#3ddc97]/60"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          )}
          <div className="min-w-0">
            {subtitle && <p className="truncate text-[12px] text-zinc-500">{subtitle}</p>}
            <h1 className="truncate text-[17px] font-semibold tracking-tight text-zinc-100">{title}</h1>
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Standard page body width and padding. */
export function PageBody({ children, width = 'max-w-5xl' }: { children: ReactNode; width?: string }) {
  return <div className={`mx-auto w-full ${width} px-4 py-6 md:px-8 md:py-8`}>{children}</div>;
}
