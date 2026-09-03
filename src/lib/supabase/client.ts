'use client';

import { createBrowserClient } from '@supabase/ssr';
import { IS_DEMO } from '@/lib/demo/config';
import { createDemoBrowserClient } from '@/lib/demo/browser';

type AppBrowserClient = ReturnType<typeof createBrowserClient>;

/** Browser client. Carries the signed-in user's JWT, so every query is RLS-scoped. */
export function createClient(): AppBrowserClient {
  if (IS_DEMO) {
    return createDemoBrowserClient() as unknown as AppBrowserClient;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
