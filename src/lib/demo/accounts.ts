import type { AppRole } from '@/lib/types';

/**
 * The five demo logins, kept in a tiny client-safe module so the login form
 * can validate credentials without pulling the whole seed dataset into the
 * browser bundle.
 */

const id = (n: number) => `a0000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

export const PROFILE_IDS = {
  admin: id(1),
  treasurer: id(2),
  exco: id(3),
  coach: id(4),
  player: id(5),
  player2: id(6),
  player3: id(7),
};

export type DemoAccount = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  blurb: string;
};

export const DEMO_LOGINS: DemoAccount[] = [
  {
    id: PROFILE_IDS.admin,
    email: 'admin@ube.academy',
    name: 'Avery Lim',
    role: 'admin',
    blurb: 'Everything, including Manage Accounts.',
  },
  {
    id: PROFILE_IDS.treasurer,
    email: 'treasurer@ube.academy',
    name: 'Priya Raman',
    role: 'treasurer',
    blurb: 'Full control of Financials, ExCo access elsewhere.',
  },
  {
    id: PROFILE_IDS.exco,
    email: 'exco@ube.academy',
    name: 'Marcus Chen',
    role: 'exco',
    blurb: 'Reads Financials, cannot edit them.',
  },
  {
    id: PROFILE_IDS.coach,
    email: 'coach@ube.academy',
    name: 'Dani Okafor',
    role: 'coach',
    blurb: 'Players and Schedule. No Financials at all.',
  },
  {
    id: PROFILE_IDS.player,
    email: 'player@ube.academy',
    name: 'Jamie Tan',
    role: 'player',
    blurb: 'Own profile, schedule, announcements. Nothing else.',
  },
];

export const findDemoLogin = (email: string) =>
  DEMO_LOGINS.find((a) => a.email === email.trim().toLowerCase()) ?? null;

export const demoLoginById = (id: string) => DEMO_LOGINS.find((a) => a.id === id) ?? null;
