'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getSiteUrl } from '@/lib/site-url';
import GoogleIcon from '@/components/ui/GoogleIcon';
import { TextLoader } from 'generative-loaders';
import 'generative-loaders/styles.css';

export default function LoginForm({ initialError = '' }: { initialError?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(initialError);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${getSiteUrl(window.location.origin)}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/calendar.events',
        queryParams: {
          // Pre-selects the work account in Google's picker. The domain is
          // enforced by the handle_new_user trigger, not by this hint.
          hd: 'spotflow.one',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
    // On success, browser is redirected by Supabase — no need to do anything
  };

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="rounded-lg border border-red-400/20 bg-red-500/[0.08] px-3 py-2.5 text-[13px] text-red-300">{error}</p>
      )}
      <button
        id="google-signin"
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-full border border-violet-400/30 bg-[#09090b] text-[14px] font-medium text-white shadow-[0_0_0_1px_rgba(139,92,246,0.045),0_0_22px_-2px_rgba(139,92,246,0.14),inset_0_1px_0_rgba(255,255,255,0.08)] outline-none transition-colors hover:border-violet-300/60 hover:bg-[#0e0e11] focus-visible:ring-2 focus-visible:ring-[#3ddc97]/60 disabled:cursor-wait"
      >
        {loading ? (
          <span className="inline-block">
            <TextLoader text="Redirecting to Google" variant="wave" color="currentColor" aria-label="Redirecting to Google" />
          </span>
        ) : (
          <>
            <GoogleIcon size={16} />
            Continue with Google
          </>
        )}
      </button>
      <p className="text-center text-[12px] text-zinc-500">
        Use your <span className="font-medium text-zinc-300">@spotflow.one</span> work account.
      </p>
    </div>
  );
}
