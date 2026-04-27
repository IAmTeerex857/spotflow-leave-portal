import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(new URL('/login', origin));
  }

  const cookieStore = await cookies();

  // Collect cookies Supabase wants to set — we'll attach them to the redirect response
  const cookiesToForward: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(c => cookiesToForward.push(c));
        },
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !user) {
    console.error('OAuth callback error:', error?.message);
    return NextResponse.redirect(new URL('/login?error=auth_failed', origin));
  }

  // Check if this is a new user who hasn't picked their team
  const { data: profile } = await supabase
    .from('profiles')
    .select('team')
    .eq('id', user.id)
    .single();

  const redirectTo = profile?.team === 'pending' ? '/onboarding' : '/dashboard';

  // Create the redirect and attach auth cookies so the browser has the session
  const response = NextResponse.redirect(new URL(redirectTo, origin));
  cookiesToForward.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  });

  return response;
}
