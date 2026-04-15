import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password'];
const MANAGER_ROUTES = ['/manager'];
const ADMIN_ROUTES = ['/admin'];

type Role = 'engineer' | 'line_manager' | 'engineering_manager' | 'head_of_product';

function isManager(role: Role) {
  return ['line_manager', 'engineering_manager', 'head_of_product'].includes(role);
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_ROUTES.includes(pathname);

  // Not logged in — redirect to login
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Logged in — redirect away from auth pages
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single();

    // Protect /admin — only is_admin = true
    if (ADMIN_ROUTES.some(r => pathname.startsWith(r))) {
      if (!profile?.is_admin) {
        return NextResponse.redirect(new URL('/403', request.url));
      }
    }

    // Protect /manager — only manager roles
    if (MANAGER_ROUTES.some(r => pathname.startsWith(r))) {
      if (!profile || !isManager(profile.role as Role)) {
        return NextResponse.redirect(new URL('/403', request.url));
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
