import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Service-role client. Bypasses RLS entirely, so it is used in exactly one
 * place: the admin account routes, and only after the caller has been proved
 * to be an admin. Never import this into a Client Component.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Account management needs it — see README.',
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
