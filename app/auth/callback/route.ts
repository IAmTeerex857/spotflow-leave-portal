import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { syncApprovedLeaveEvents } from '@/lib/google-calendar';
import { getSiteUrl } from '@/lib/site-url';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = getSiteUrl(requestUrl.origin);

  if (!code) {
    return NextResponse.redirect(new URL('/login', origin));
  }

  const cookieStore = await cookies();

  const cookiesToForward: Array<{ name: string; value: string; options: CookieOptions }> = [];
  const headersToForward: Record<string, string> = {};

  const redirect = (pathname: string) => {
    const response = NextResponse.redirect(new URL(pathname, origin));

    cookiesToForward.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
    });
    Object.entries(headersToForward).forEach(([name, value]) => {
      response.headers.set(name, value);
    });

    return response;
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet, headers) {
          cookiesToForward.push(...cookiesToSet);
          Object.assign(headersToForward, headers);
        },
      },
    }
  );

  const { data: { user, session }, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !user) {
    console.error('OAuth callback error:', error?.message);
    return redirect('/login?error=auth_failed');
  }

  // Persist the Google refresh token for Calendar sync.
  // Only present when Google returns it (first login, or after re-consent with prompt=consent)
  if (session?.provider_refresh_token) {
    try {
      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { error: tokenError } = await supabaseAdmin.from('user_tokens').upsert({
        user_id: user.id,
        provider: 'google',
        refresh_token: session.provider_refresh_token,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,provider' });
      if (tokenError) throw tokenError;
    } catch (tokenErr) {
      // Non-fatal — calendar sync degrades gracefully if token is missing
      console.warn('Failed to store Google refresh token:', tokenErr);
    }
  }

  try {
    await syncApprovedLeaveEvents(user.id);
  } catch (calendarErr) {
    // Calendar failures must not prevent the user from signing in.
    console.warn('Failed to sync approved leave events:', calendarErr);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('team')
    .eq('id', user.id)
    .single();

  const redirectTo = profile?.team === 'pending' ? '/onboarding' : '/dashboard';

  return redirect(redirectTo);
}
