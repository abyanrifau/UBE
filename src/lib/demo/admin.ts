import { createDemoClient } from './client';
import { PROFILE_IDS } from './accounts';
import { db, tableRows } from './store';
import type { AppRole, Profile } from '@/lib/types';

/**
 * Demo stand-in for the service-role client. It runs as the seeded admin, so
 * the store's write checks pass, and it adds the `auth.admin` surface that
 * src/lib/actions/accounts.ts calls.
 *
 * Callers still go through assertOwner() first, exactly as they do against
 * real Supabase. The demo does not skip that check.
 */
export function createDemoAdminClient() {
  const base = createDemoClient(PROFILE_IDS.admin);

  return {
    ...base,
    auth: {
      ...base.auth,
      admin: {
        createUser: async ({
          email,
          user_metadata,
        }: {
          email: string;
          password?: string;
          email_confirm?: boolean;
          user_metadata?: { full_name?: string; role?: AppRole };
        }) => {
          if (db.profiles.some((p) => p.email === email)) {
            return {
              data: { user: null },
              error: { message: 'A user with this email address has already been registered' },
            };
          }

          const now = new Date().toISOString();
          const profile: Profile = {
            id: crypto.randomUUID(),
            email,
            full_name: user_metadata?.full_name ?? '',
            role: user_metadata?.role ?? 'player',
            is_active: true,
            must_set_password: true,
            theme: 'system',
            phone: null,
            created_at: now,
            updated_at: now,
          };
          db.profiles.push(profile);
          return { data: { user: { id: profile.id, email } }, error: null };
        },

        updateUserById: async (id: string) => {
          const found = db.profiles.find((p) => p.id === id);
          return found
            ? { data: { user: { id } }, error: null }
            : { data: { user: null }, error: { message: 'User not found' } };
        },

        deleteUser: async (id: string) => {
          const rows = tableRows('profiles');
          const index = rows?.findIndex((r) => r.id === id) ?? -1;
          if (index < 0 || !rows) return { data: null, error: { message: 'User not found' } };
          rows.splice(index, 1);
          for (const player of db.players) {
            if (player.profile_id === id) player.profile_id = null;
          }
          return { data: null, error: null };
        },

        signOut: async () => ({ data: null, error: null }),
      },
    },
  };
}
