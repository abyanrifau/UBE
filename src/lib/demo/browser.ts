'use client';

import { DEMO_COOKIE, DEMO_PASSWORD } from './config';
import { demoLoginById, findDemoLogin } from './accounts';

/**
 * Browser half of demo mode.
 *
 * The in-memory store lives in the Node process, so the browser cannot read
 * or write it directly. What the browser does need is auth: signing in sets a
 * readable cookie naming the demo account, which the server and middleware
 * then use to resolve the session. Data calls made from Client Components
 * (only the theme write, today) resolve successfully and do nothing.
 */

const YEAR = 60 * 60 * 24 * 365;

export function readDemoCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${DEMO_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeDemoCookie(value: string | null) {
  document.cookie =
    value === null
      ? `${DEMO_COOKIE}=; path=/; max-age=0; SameSite=Lax`
      : `${DEMO_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${YEAR}; SameSite=Lax`;
}

const settled = <T,>(data: T) => Promise.resolve({ data, error: null });

/** Minimal thenable so `.select().eq().maybeSingle()` chains resolve. */
function stubQuery(resolve: () => unknown) {
  const chain: Record<string, unknown> = {};
  const self = new Proxy(chain, {
    get(_target, prop) {
      if (prop === 'then') {
        return (onFulfilled: (v: unknown) => unknown) =>
          Promise.resolve({ data: resolve(), error: null, count: null }).then(onFulfilled);
      }
      return () => self;
    },
  });
  return self;
}

export function createDemoBrowserClient() {
  return {
    from(table: string) {
      const builder = {
        select: () =>
          stubQuery(() => {
            if (table !== 'profiles') return null;
            const account = demoLoginById(readDemoCookie() ?? '');
            return account ? { is_active: true, must_set_password: false } : null;
          }),
        insert: () => stubQuery(() => null),
        update: () => stubQuery(() => null),
        delete: () => stubQuery(() => null),
        upsert: () => stubQuery(() => null),
      };
      return builder;
    },

    rpc: async () => ({ data: null, error: null }),

    auth: {
      getUser: async () => {
        const id = readDemoCookie();
        return { data: { user: id ? { id } : null }, error: null };
      },

      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        const account = findDemoLogin(email);
        if (!account || password !== DEMO_PASSWORD) {
          return {
            data: { user: null },
            error: { message: 'Invalid login credentials', name: 'AuthApiError', status: 400 },
          };
        }
        writeDemoCookie(account.id);
        return { data: { user: { id: account.id, email: account.email } }, error: null };
      },

      signOut: async () => {
        writeDemoCookie(null);
        return { error: null };
      },

      updateUser: async () => settled({ user: null }),
    },
  };
}
