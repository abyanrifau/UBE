import type { AppRole, Squad } from './types';

/**
 * The single source of truth for what each role may do in the UI.
 * These mirror the RLS policies in supabase/migrations/0001_init.sql.
 * If you change one, change the other. The database is the real gate;
 * this file only decides what to render.
 */

export const ALL_ROLES: AppRole[] = ['admin', 'treasurer', 'exco', 'coach', 'player'];

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: 'Admin',
  treasurer: 'Treasurer',
  exco: 'ExCo Member',
  coach: 'Coach',
  player: 'Player',
};

export const ROLE_BLURB: Record<AppRole, string> = {
  admin: 'Full access to everything, including account management.',
  treasurer: 'Runs the books. ExCo access everywhere else.',
  exco: 'Scheduling, players, announcements. Can read financials.',
  coach: 'Owns the academy. Full access to everything, same as Admin.',
  player: 'Own profile, schedule and announcements.',
};

/**
 * Owners hold the academy, not just an account on it. The Coach owns UBE, so
 * the Coach and the Admin have identical reach: every screen, including
 * Financials and Manage Accounts.
 */
const OWNERS: AppRole[] = ['admin', 'coach'];
const STAFF: AppRole[] = ['admin', 'coach', 'treasurer', 'exco'];
const FINANCE_VIEWERS: AppRole[] = ['admin', 'coach', 'treasurer', 'exco'];
const FINANCE_EDITORS: AppRole[] = ['admin', 'coach', 'treasurer'];

const has = (role: AppRole | null | undefined, set: AppRole[]) => !!role && set.includes(role);

/** Literally the Admin role. Rarely what you want; prefer isOwner. */
export const isAdmin = (r?: AppRole | null) => r === 'admin';
/** Admin or Coach: top-level authority over the academy. */
export const isOwner = (r?: AppRole | null) => has(r, OWNERS);
export const isStaff = (r?: AppRole | null) => has(r, STAFF);

/** Full roster: view every player's record. */
export const canViewRoster = (r?: AppRole | null) => has(r, STAFF);
/** Create/edit players, attendance and match stats. */
export const canManageRoster = (r?: AppRole | null) => has(r, STAFF);
/** Create/edit calendar events. */
export const canManageSchedule = (r?: AppRole | null) => has(r, STAFF);
/** Write announcements. */
export const canPostAnnouncements = (r?: AppRole | null) => has(r, STAFF);
/** Read monthly + yearly statements. */
export const canViewFinance = (r?: AppRole | null) => has(r, FINANCE_VIEWERS);
/** Add, edit or delete finance entries. */
export const canManageFinance = (r?: AppRole | null) => has(r, FINANCE_EDITORS);
/** Create accounts and assign roles. */
export const canManageAccounts = (r?: AppRole | null) => has(r, OWNERS);

/* ------------------------------------------------------------------ */
/* Squads                                                              */
/*                                                                     */
/* The academy runs a boys squad and a girls squad. Staff work across   */
/* both. A player belongs to one, and sees that squad plus anything     */
/* addressed to the whole academy.                                     */
/*                                                                     */
/* These mirror public.can_see_squad() in                              */
/* supabase/migrations/0002_squads.sql.                                */
/* ------------------------------------------------------------------ */

export const SQUADS: Squad[] = ['boys', 'girls'];

export const SQUAD_LABEL: Record<Squad, string> = {
  boys: 'Boys',
  girls: 'Girls',
};

/** What a squad's own people are called, for prose. */
export const SQUAD_NOUN: Record<Squad, string> = {
  boys: 'boys squad',
  girls: 'girls squad',
};

/** Staff work across both squads. */
export const canViewBothSquads = (r?: AppRole | null) => has(r, STAFF);

/**
 * May this person see rows belonging to `target`?
 * `target` of null means the whole academy, which everyone can see.
 */
export function canViewSquad(
  role: AppRole | null | undefined,
  mySquad: Squad | null | undefined,
  target: Squad | null,
): boolean {
  if (target === null) return true;
  if (canViewBothSquads(role)) return true;
  return !!mySquad && mySquad === target;
}

/** The squad tabs this person may open, in display order. */
export function visibleSquads(
  role: AppRole | null | undefined,
  mySquad: Squad | null | undefined,
): Squad[] {
  return SQUADS.filter((s) => canViewSquad(role, mySquad, s));
}
