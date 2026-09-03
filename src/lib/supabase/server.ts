import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import type { Profile } from '@/lib/types';

/**
 * Server client bound to the request cookies. Every query made through it
 * runs as the signed-in user, so RLS applies exactly as it does in the browser.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list: { name: string; value: string; options: CookieOptions }[]) => {
          try {
            list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component; the middleware refreshes the session instead.
          }
        },
      },
    },
  );
}

export type Session = { profile: Profile; userId: string };

/** Returns the signed-in profile, or null. Never throws. */
export async function getSession(): Promise<Session | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle<Profile>();

  if (!profile || !profile.is_active) return null;
  return { profile, userId: user.id };
}

/**
 * Guard for every page under (app). Bounces to login when signed out and to
 * the password setup screen while the temporary password is still in place.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.profile.must_set_password) redirect('/set-password');
  return session;
}
