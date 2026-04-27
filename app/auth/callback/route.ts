import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user) {
      // Check if this is a new user who needs to pick their team
      const { data: profile } = await supabase
        .from('profiles')
        .select('team')
        .eq('id', user.id)
        .single();

      if (profile?.team === 'pending') {
        return NextResponse.redirect(new URL('/onboarding', origin));
      }

      return NextResponse.redirect(new URL('/dashboard', origin));
    }
  }

  // Something went wrong - back to login
  return NextResponse.redirect(new URL('/login?error=auth_failed', origin));
}
