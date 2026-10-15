import Link from 'next/link';
import { ShieldOff } from 'lucide-react';

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0c0c0e] px-4">
      <div className="flex max-w-sm flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/[0.08] text-red-300">
          <ShieldOff className="h-6 w-6" />
        </span>
        <h1 className="mt-6 text-[20px] font-semibold tracking-tight text-zinc-100">You don’t have access to this page</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-500">It’s for managers or admins. If you think that’s a mistake, ask an admin to check your role.</p>
        <Link href="/dashboard" className="mt-7 inline-flex h-9 items-center rounded-full border border-white/[0.07] bg-white/[0.04] px-4 text-[13px] font-medium text-zinc-200 hover:bg-white/[0.07]">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
