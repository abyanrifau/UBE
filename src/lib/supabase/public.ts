import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { IS_DEMO } from '@/lib/demo/config';
import { createDemoClient } from '@/lib/demo/client';

// Supabase’s own loose schema typing — the app has no generated Database type.
type PublicClient = SupabaseClient<any, 'public', any>;

/**
 * Anonymous client with no session attached — used only by the public
 * homepage. `anon` has been revoked from every table in the schema, so the
 * one thing this can read is the `public_events` view, which exposes four
 * columns of events an editor has explicitly ticked as public.
 *
 * Deliberately cookie-free so the homepage can stay statically rendered.
 */
export function createPublicClient(): PublicClient {
  if (IS_DEMO) {
    // No session: only the public_events view is readable, same as anon.
    return createDemoClient(null) as unknown as PublicClient;
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
