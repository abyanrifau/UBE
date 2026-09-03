import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { IS_DEMO } from '@/lib/demo/config';
import { createDemoAdminClient } from '@/lib/demo/admin';

// Supabase’s own loose schema typing — the app has no generated Database type.
type AdminClient = SupabaseClient<any, 'public', any>;

/**
 * Service-role client. Bypasses RLS entirely, so it is used in exactly one
 * place: the admin account routes, and only after the caller has been proved
 * to be an admin. Never import this into a Client Component.
 */
export function createAdminClient(): AdminClient {
  if (IS_DEMO) {
    return createDemoAdminClient() as unknown as AdminClient;
  }

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
