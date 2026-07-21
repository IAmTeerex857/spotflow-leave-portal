import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { getSiteUrl } from '@/lib/site-url';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password', '/auth/callback', '/onboarding'];
const MANAGER_ROUTES = ['/manager'];
const ADMIN_ROUTES = ['/admin'];

type Role =
  | 'engineer'
  | 'frontend_engineer'
  | 'backend_engineer'
  | 'qa_engineer'
  | 'operations'
  | 'marketing'
  | 'product_designer'
  | 'product_manager'
  | 'frontend_line_manager'
  | 'backend_line_manager'
  | 'engineering_manager'
  | 'head_of_product'
  | 'head_of_operations'
  | 'line_manager';

function isManager(role: Role) {
  return [
    'frontend_line_manager',
    'backend_line_manager',
    'engineering_manager',
    'head_of_product',
    'head_of_operations',
    'line_manager',
  ].includes(role);
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const cookiesToForward: Array<{ name: string; value: string; options: CookieOptions }> = [];
  const headersToForward: Record<string, string> = {};

  const redirect = (pathname: string) => {
    const response = NextResponse.redirect(
      new URL(pathname, getSiteUrl(request.nextUrl.origin))
    );

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
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet, headers) {
          cookiesToForward.push(...cookiesToSet);
          Object.assign(headersToForward, headers);
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          Object.entries(headers).forEach(([name, value]) => {
            supabaseResponse.headers.set(name, value);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  // Not logged in — redirect to login
  if (!user && !isPublic) {
    return redirect('/login');
  }

  // Logged in — redirect away from auth pages and landing
  if (user && ['/', '/login', '/signup'].includes(pathname)) {
    return redirect('/dashboard');
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, team, is_admin')
      .eq('id', user.id)
      .single();

    // New Google user who hasn't picked a team yet
    if (profile?.team === 'pending' && pathname !== '/onboarding') {
      return redirect('/onboarding');
    }

    // Protect /admin — only is_admin = true
    if (ADMIN_ROUTES.some(r => pathname.startsWith(r))) {
      if (!profile?.is_admin) {
        return redirect('/403');
      }
    }

    // Protect /manager — only manager roles
    if (MANAGER_ROUTES.some(r => pathname.startsWith(r))) {
      if (!profile || !isManager(profile.role as Role)) {
        return redirect('/403');
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
