/**
 * Demo mode: a placeholder backend so the app can be explored before a
 * Supabase project exists.
 *
 * When NEXT_PUBLIC_DEMO_MODE=true, every Supabase client in the app is
 * swapped for an in-memory fake (src/lib/demo/client.ts) seeded with a
 * realistic academy. Sign-in accepts five fixed accounts, one per role.
 *
 * ⚠ This is an authentication bypass. It is off unless the flag is explicitly
 *   set, a banner is shown on every screen while it is on, and it must never
 *   be set on a deployment holding real data. Delete the flag the moment the
 *   Supabase keys are in place.
 */

export const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

/** Same password for every demo account. It is not protecting anything. */
export const DEMO_PASSWORD = 'ubedemo';

/** Readable cookie (not httpOnly) so the browser shim can set it directly. */
export const DEMO_COOKIE = 'ube-demo-session';

export const DEMO_ACCOUNTS = [
  { email: 'admin@ube.academy', label: 'Admin' },
  { email: 'treasurer@ube.academy', label: 'Treasurer' },
  { email: 'exco@ube.academy', label: 'ExCo Member' },
  { email: 'coach@ube.academy', label: 'Coach' },
  { email: 'player@ube.academy', label: 'Player' },
] as const;
