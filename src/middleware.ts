import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

const PUBLIC_PATHS = ['/', '/login', '/set-password', '/auth'];

const isPublic = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || (p !== '/' && pathname.startsWith(`${p}/`)));

/**
 * Refreshes the Supabase session cookie on every request and keeps signed-out
 * visitors out of the app shell. This is a convenience gate — the real
 * enforcement lives in the RLS policies.
 */
export async function middleware(request: NextRequest) {
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

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // A signed-in member hitting the login screen goes straight to work.
  // The public homepage stays reachable for everyone.
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|brand|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)'],
};
