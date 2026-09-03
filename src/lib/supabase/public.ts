import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Anonymous client with no session attached — used only by the public
 * homepage. `anon` has been revoked from every table in the schema, so the
 * one thing this can read is the `public_events` view, which exposes four
 * columns of events an editor has explicitly ticked as public.
 *
 * Deliberately cookie-free so the homepage can stay statically rendered.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
