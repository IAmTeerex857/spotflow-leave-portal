import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0c0c0e] px-4">
      <div className="flex max-w-sm flex-col items-center text-center">
        <p className="text-[88px] font-bold leading-none tracking-[-0.05em] text-white/[0.06]">404</p>
        <h1 className="mt-4 text-[20px] font-semibold tracking-tight text-zinc-100">Page not found</h1>
        <p className="mt-2 text-[14px] text-zinc-500">It doesn’t exist, or it has moved.</p>
        <Link href="/dashboard" className="mt-7 inline-flex h-9 items-center rounded-full bg-zinc-100 px-4 text-[13px] font-medium text-zinc-900 hover:bg-white">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
