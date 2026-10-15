import Link from 'next/link';
import LoginForm from '@/components/auth/LoginForm';
import { SpotflowLogo } from '@/components/brand/SpotflowLogo';

const ERROR_MESSAGES: Record<string, string> = {
  not_allowed: 'Only @spotflow.one Google accounts can use the Leave Portal.',
  auth_failed: 'Sign-in didn’t complete. Please try again.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { error } = await searchParams;
  const initialError = typeof error === 'string' ? ERROR_MESSAGES[error] ?? ERROR_MESSAGES.auth_failed : '';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0c0c0e] px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mx-auto mb-8 flex w-fit items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#3ddc97]/60">
          <SpotflowLogo size={26} />
          <span className="text-[16px] font-semibold tracking-tight text-zinc-100">Spotflow</span>
        </Link>
        <div className="rounded-2xl border border-white/[0.07] bg-[#111114] p-7">
          <h1 className="text-[20px] font-semibold tracking-tight text-zinc-100">Sign in to Leave</h1>
          <p className="mb-6 mt-1.5 text-[14px] text-zinc-500">Request time off, track approvals and see who’s away.</p>
          <LoginForm initialError={initialError} />
        </div>
        <p className="mt-6 text-center text-[12px] text-zinc-600">
          <Link href="/" className="hover:text-zinc-400">← Back to home</Link>
        </p>
      </div>
    </main>
  );
}
