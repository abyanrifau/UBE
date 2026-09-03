import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { DEMO_COOKIE, IS_DEMO } from '@/lib/demo/config';

const PUBLIC_PATHS = ['/', '/login', '/set-password', '/auth'];

const isPublic = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || (p !== '/' && pathname.startsWith(`${p}/`)));

/**
 * Refreshes the Supabase session cookie on every request and keeps signed-out
 * visitors out of the app shell. This is a convenience gate — the real
 * enforcement lives in the RLS policies.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Demo mode: the session is a plain cookie naming one of the seeded
  // accounts, so Supabase is not involved at all.
  if (IS_DEMO) {
    const signedIn = Boolean(request.cookies.get(DEMO_COOKIE)?.value);
    return gate(request, pathname, signedIn) ?? NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirect = gate(request, pathname, Boolean(user));
  return redirect ?? response;
}

/**
 * Keeps signed-out visitors out of the app shell and signed-in members off
 * the login screen. Returns a redirect, or null to continue.
 *
 * This is a convenience gate — the real enforcement is RLS.
 */
function gate(request: NextRequest, pathname: string, signedIn: boolean) {
  if (!signedIn && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // The public homepage stays reachable for everyone.
  if (signedIn && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return null;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|brand|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)'],
};
