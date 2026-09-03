import type {
  AcademyEvent,
  Announcement,
  AttendanceRow,
  EventRsvp,
  FinanceEntry,
  MatchStat,
  Player,
  Profile,
} from '@/lib/types';
import { PROFILE_IDS } from './accounts';

/**
 * A plausible academy, generated relative to today so the calendar and the
 * yearly statement always look current.
 */

const now = new Date();
const YEAR = now.getUTCFullYear();

const iso = (daysFromNow: number, hour = 19, minutes = 0) => {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  d.setUTCHours(hour, minutes, 0, 0);
  return d.toISOString();
};

const dateOnly = (month: number, day: number) =>
  `${YEAR}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const id = (prefix: string, n: number) => `${prefix}-0000-0000-0000-${String(n).padStart(12, '0')}`;

/* ------------------------------------------------------------------ */
/* Profiles — one per role, plus a few extra players                   */
/* ------------------------------------------------------------------ */

const profileBase = {
  is_active: true,
  must_set_password: false,
  theme: 'system' as const,
  created_at: iso(-210, 9),
  updated_at: iso(-210, 9),
};

export const seedProfiles: Profile[] = [
  {
    ...profileBase,
    id: PROFILE_IDS.admin,
    email: 'admin@ube.academy',
    full_name: 'Avery Lim',
    role: 'admin',
    phone: '+65 8123 4567',
  },
  {
    ...profileBase,
    id: PROFILE_IDS.treasurer,
    email: 'treasurer@ube.academy',
    full_name: 'Priya Raman',
    role: 'treasurer',
    phone: '+65 8234 5678',
  },
  {
    ...profileBase,
    id: PROFILE_IDS.exco,
    email: 'exco@ube.academy',
    full_name: 'Marcus Chen',
    role: 'exco',
    phone: null,
  },
  {
    ...profileBase,
    id: PROFILE_IDS.coach,
    email: 'coach@ube.academy',
    full_name: 'Dani Okafor',
    role: 'coach',
    phone: '+65 8345 6789',
  },
  {
    ...profileBase,
    id: PROFILE_IDS.player,
    email: 'player@ube.academy',
    full_name: 'Jamie Tan',
    role: 'player',
    phone: '+65 8456 7890',
  },
  {
    ...profileBase,
    id: PROFILE_IDS.player2,
    email: 'sofia@ube.academy',
    full_name: 'Sofia Alvarez',
    role: 'player',
    phone: null,
  },
  {
    ...profileBase,
    id: PROFILE_IDS.player3,
    email: 'noah@ube.academy',
    full_name: 'Noah Bergström',
    role: 'player',
    phone: null,
    must_set_password: true, // shows the "Password not set" state in Accounts
  },
];

/* ------------------------------------------------------------------ */
/* Players                                                             */
/* ------------------------------------------------------------------ */

type PlayerSeed = [
  name: string,
  jersey: number,
  position: string,
  height: number,
  weight: number,
  dob: string,
  linkedProfile?: string,
];

const playerSeeds: PlayerSeed[] = [
  ['Jamie Tan', 7, 'Outside Hitter', 178, 68, '2006-04-12', PROFILE_IDS.player],
  ['Sofia Alvarez', 3, 'Setter', 171, 61, '2005-09-30', PROFILE_IDS.player2],
  ['Noah Bergström', 11, 'Middle Blocker', 192, 82, '2004-01-25', PROFILE_IDS.player3],
  ['Aisha Rahman', 5, 'Libero', 163, 55, '2007-06-08'],
  ['Kai Nakamura', 9, 'Opposite', 185, 76, '2005-11-14'],
  ['Leo Fernandes', 1, 'Setter', 176, 70, '2006-02-19'],
  ['Mira Kowalski', 14, 'Outside Hitter', 174, 64, '2006-08-03'],
  ['Tomás Duarte', 8, 'Middle Blocker', 189, 79, '2004-12-07'],
  ['Hana Yusof', 6, 'Defensive Specialist', 166, 57, '2007-03-22'],
  ['Ethan Wong', 12, 'Opposite', 183, 74, '2005-05-16'],
  ['Zara Ahmed', 4, 'Outside Hitter', 177, 66, '2006-10-09'],
  ['Callum Reid', 2, 'Libero', 168, 62, '2005-07-28'],
  ['Ines Oliveira', 10, 'Middle Blocker', 186, 75, '2004-09-11'],
  ['Ravi Menon', 15, 'Outside Hitter', 180, 71, '2007-01-05'],
];

export const seedPlayers: Player[] = playerSeeds.map(
  ([full_name, jersey_number, position, height_cm, weight_kg, date_of_birth, profile_id], i) => ({
    id: id('b0000000', i + 1),
    profile_id: profile_id ?? null,
    full_name,
    jersey_number,
    position,
    height_cm,
    weight_kg,
    date_of_birth,
    email: `${full_name.split(' ')[0].toLowerCase()}@example.com`,
    phone: i % 3 === 0 ? `+65 9${String(100000 + i * 7919).slice(0, 6)}` : null,
    guardian_name: date_of_birth > '2007-01-01' ? `${full_name.split(' ')[1]} (parent)` : null,
    guardian_phone: date_of_birth > '2007-01-01' ? '+65 9876 5432' : null,
    notes:
      i === 0
        ? 'Strong line shot. Working on back-row discipline — tends to drift left on serve receive.'
        : i === 2
          ? 'Cleared to return after ankle sprain. Ease back into full jump load over two weeks.'
          : null,
    is_active: i < 13,
    created_at: iso(-200 + i, 10),
    updated_at: iso(-30, 10),
  }),
);

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

const ALL_ROLES_ARR = ['admin', 'treasurer', 'exco', 'coach', 'player'] as const;
const STAFF_ONLY = ['admin', 'treasurer', 'exco'] as const;

type EventSeed = {
  title: string;
  type: AcademyEvent['type'];
  offset: number;
  hour: number;
  durationH?: number;
  location: string;
  description?: string;
  roles?: readonly string[];
  isPublic?: boolean;
};

const eventSeeds: EventSeed[] = [
  { title: 'Tuesday practice', type: 'practice', offset: -21, hour: 19, durationH: 2, location: 'Main Hall, Court 2' },
  { title: 'Thursday practice', type: 'practice', offset: -19, hour: 19, durationH: 2, location: 'Main Hall, Court 2' },
  {
    title: 'Friendly vs Northside VC',
    type: 'match',
    offset: -14,
    hour: 15,
    durationH: 3,
    location: 'Northside Sports Centre',
    description: 'Bring both kits. Warm-up starts 45 minutes before first serve.',
    isPublic: true,
  },
  { title: 'Tuesday practice', type: 'practice', offset: -14, hour: 19, durationH: 2, location: 'Main Hall, Court 2' },
  { title: 'Thursday practice', type: 'practice', offset: -12, hour: 19, durationH: 2, location: 'Main Hall, Court 2' },
  {
    title: 'ExCo monthly meeting',
    type: 'meeting',
    offset: -10,
    hour: 20,
    durationH: 1,
    location: 'Clubhouse',
    description: 'Budget review, kit order, tournament entry deadlines.',
    roles: STAFF_ONLY,
  },
  { title: 'Tuesday practice', type: 'practice', offset: -7, hour: 19, durationH: 2, location: 'Main Hall, Court 2' },
  { title: 'Thursday practice', type: 'practice', offset: -5, hour: 19, durationH: 2, location: 'Main Hall, Court 2' },
  {
    title: 'Conditioning session',
    type: 'practice',
    offset: -3,
    hour: 18,
    durationH: 1,
    location: 'Gym, Level 2',
    description: 'Lower-body strength and landing mechanics. No ball work.',
  },
  { title: 'Tuesday practice', type: 'practice', offset: 1, hour: 19, durationH: 2, location: 'Main Hall, Court 2', description: 'Serve receive focus. Full squad expected.' },
  { title: 'Thursday practice', type: 'practice', offset: 3, hour: 19, durationH: 2, location: 'Main Hall, Court 2' },
  {
    title: 'League match vs Eastbrook',
    type: 'match',
    offset: 6,
    hour: 16,
    durationH: 3,
    location: 'UBE Main Hall',
    description: 'Home fixture. Meet 90 minutes before first serve for warm-up and setup.',
    isPublic: true,
  },
  { title: 'Tuesday practice', type: 'practice', offset: 8, hour: 19, durationH: 2, location: 'Main Hall, Court 2' },
  {
    title: 'ExCo budget planning',
    type: 'meeting',
    offset: 9,
    hour: 20,
    durationH: 1,
    location: 'Clubhouse',
    description: 'Half-year figures and the kit reorder decision.',
    roles: STAFF_ONLY,
  },
  { title: 'Thursday practice', type: 'practice', offset: 10, hour: 19, durationH: 2, location: 'Main Hall, Court 2' },
  {
    title: 'Regional Invitational',
    type: 'tournament',
    offset: 17,
    hour: 9,
    durationH: 9,
    location: 'National Indoor Stadium',
    description:
      'Two-day tournament. Pool games Saturday, knockouts Sunday. Travel details to follow.',
    isPublic: true,
  },
  {
    title: 'Squad social + kit handout',
    type: 'event',
    offset: 24,
    hour: 18,
    durationH: 3,
    location: 'Clubhouse',
    description: 'End-of-season dinner. Plus ones welcome.',
    isPublic: true,
  },
];

export const seedEvents: AcademyEvent[] = eventSeeds.map((e, i) => ({
  id: id('c0000000', i + 1),
  title: e.title,
  type: e.type,
  starts_at: iso(e.offset, e.hour),
  ends_at: e.durationH ? iso(e.offset, e.hour + e.durationH) : null,
  location: e.location,
  description: e.description ?? null,
  visible_to_roles: [...((e.roles ?? ALL_ROLES_ARR) as readonly Profile['role'][])],
  rsvp_enabled: e.type !== 'meeting',
  is_public: e.isPublic ?? false,
  created_by: e.type === 'meeting' ? PROFILE_IDS.exco : PROFILE_IDS.coach,
  created_by_name: e.type === 'meeting' ? 'Marcus Chen' : 'Dani Okafor',
  created_at: iso(e.offset - 14, 12),
  updated_at: iso(e.offset - 14, 12),
}));

/* ------------------------------------------------------------------ */
/* Attendance — only for events that have already happened             */
/* ------------------------------------------------------------------ */

const pastEvents = seedEvents.filter((e) => Date.parse(e.starts_at) < now.getTime());

export const seedAttendance: AttendanceRow[] = pastEvents.flatMap((event, ei) =>
  seedPlayers
    .filter((p) => p.is_active)
    .map((player, pi) => {
      // Deterministic spread: mostly present, a scatter of absences.
      const roll = (ei * 7 + pi * 13) % 10;
      const status: AttendanceRow['status'] =
        roll === 0 ? 'absent' : roll === 1 ? 'excused' : 'present';
      return {
        id: id('d0000000', ei * 100 + pi + 1),
        event_id: event.id,
        player_id: player.id,
        status,
        note: status === 'excused' ? 'Told coach in advance' : null,
        recorded_by: PROFILE_IDS.coach,
        recorded_at: event.starts_at,
      };
    }),
);

/* ------------------------------------------------------------------ */
/* Match stats — for the past match only                               */
/* ------------------------------------------------------------------ */

const pastMatch = pastEvents.find((e) => e.type === 'match');

export const seedMatchStats: MatchStat[] = pastMatch
  ? seedPlayers.slice(0, 8).map((player, i) => ({
      id: id('e0000000', i + 1),
      event_id: pastMatch.id,
      player_id: player.id,
      points: [14, 3, 11, 2, 16, 4, 9, 7][i],
      kills: [11, 1, 8, 0, 13, 2, 7, 5][i],
      blocks: [1, 0, 3, 0, 2, 1, 1, 2][i],
      aces: [2, 2, 0, 2, 1, 1, 1, 0][i],
      digs: [9, 6, 3, 18, 4, 7, 8, 3][i],
      assists: [2, 31, 1, 4, 1, 27, 2, 1][i],
      serve_errors: [1, 0, 2, 0, 3, 1, 0, 1][i],
      notes: i === 0 ? 'Best match of the season so far.' : null,
      recorded_by: PROFILE_IDS.coach,
      created_at: pastMatch.starts_at,
    }))
  : [];

/* ------------------------------------------------------------------ */
/* RSVPs                                                               */
/* ------------------------------------------------------------------ */

const upcoming = seedEvents.filter(
  (e) => Date.parse(e.starts_at) >= now.getTime() && e.rsvp_enabled,
);

export const seedRsvps: EventRsvp[] = upcoming.flatMap((event, ei) =>
  [PROFILE_IDS.player, PROFILE_IDS.player2, PROFILE_IDS.coach, PROFILE_IDS.exco].map(
    (profile_id, pi) => ({
      id: id('f0000000', ei * 10 + pi + 1),
      event_id: event.id,
      profile_id,
      status: (['going', 'going', 'maybe', 'going', 'not_going'] as const)[(ei + pi) % 5],
      updated_at: iso(-1, 12),
    }),
  ),
);

/* ------------------------------------------------------------------ */
/* Announcements                                                       */
/* ------------------------------------------------------------------ */

export const seedAnnouncements: Announcement[] = [
  {
    id: id('11000000', 1),
    title: 'Regional Invitational — travel and kit',
    body: 'Coach will confirm the travelling squad after Thursday practice.\n\nBus leaves the clubhouse at 06:45 sharp on the Saturday. Bring both kits, a spare pair of shoes and your own water bottle. Lunch is provided at the venue; bring cash for dinner.\n\nIf you cannot make either day, tell Dani before Thursday so we can plan rotations.',
    pinned: true,
    visible_to_roles: [...ALL_ROLES_ARR],
    author_id: PROFILE_IDS.coach,
    author_name: 'Dani Okafor',
    created_at: iso(-2, 21),
    updated_at: iso(-2, 21),
  },
  {
    id: id('11000000', 2),
    title: 'Subs due by the end of the month',
    body: 'Term subs are due by the 30th. Bank transfer is easiest — reference your name and jersey number so Priya can reconcile it.\n\nIf paying is a problem this term, message a committee member privately. We would rather sort it out quietly than have anyone drop out.',
    pinned: true,
    visible_to_roles: [...ALL_ROLES_ARR],
    author_id: PROFILE_IDS.treasurer,
    author_name: 'Priya Raman',
    created_at: iso(-5, 18),
    updated_at: iso(-5, 18),
  },
  {
    id: id('11000000', 3),
    title: 'Kit reorder — decision needed before Friday',
    body: 'Two quotes are in. The cheaper supplier is 18% under budget but has a six-week lead time, which lands after the Invitational.\n\nBudget breakdown is in the Financials tab. Please read before the meeting so we can decide in ten minutes rather than forty.',
    pinned: false,
    visible_to_roles: [...STAFF_ONLY],
    author_id: PROFILE_IDS.exco,
    author_name: 'Marcus Chen',
    created_at: iso(-6, 14),
    updated_at: iso(-6, 14),
  },
  {
    id: id('11000000', 4),
    title: 'Court 2 booking confirmed through the season',
    body: 'We have Main Hall Court 2 locked in for Tuesdays and Thursdays, 19:00–21:00, for the rest of the season. No more week-to-week uncertainty.\n\nThe hall closes its doors at 21:15, so please help pack down promptly.',
    pinned: false,
    visible_to_roles: [...ALL_ROLES_ARR],
    author_id: PROFILE_IDS.exco,
    author_name: 'Marcus Chen',
    created_at: iso(-11, 10),
    updated_at: iso(-11, 10),
  },
  {
    id: id('11000000', 5),
    title: 'Serve receive is our weak point — here is the plan',
    body: 'We lost 11 points off serve receive against Northside. That is the single biggest thing between us and a top-three finish.\n\nNext three practices open with 25 minutes of passing under pressure. It will be repetitive and it will be boring. Do it anyway.',
    pinned: false,
    visible_to_roles: [...ALL_ROLES_ARR],
    author_id: PROFILE_IDS.coach,
    author_name: 'Dani Okafor',
    created_at: iso(-13, 22),
    updated_at: iso(-13, 22),
  },
];

/* ------------------------------------------------------------------ */
/* Finance                                                             */
/* ------------------------------------------------------------------ */

type FinanceSeed = [month: number, day: number, kind: 'income' | 'expense', category: string, description: string, amount: number];

const financeSeeds: FinanceSeed[] = [
  [1, 12, 'income', 'Membership fees', 'Term 1 subs — 22 players', 6600],
  [1, 15, 'expense', 'Court hire', 'Main Hall Court 2, January', 1280],
  [1, 20, 'expense', 'Equipment', 'Replacement balls (12) and net tension kit', 940],
  [2, 5, 'expense', 'Court hire', 'Main Hall Court 2, February', 1280],
  [2, 14, 'income', 'Sponsorship', 'Kopi Corner — season sponsorship', 3000],
  [2, 22, 'expense', 'Coaching', 'Head coach stipend, February', 1500],
  [3, 3, 'expense', 'Court hire', 'Main Hall Court 2, March', 1280],
  [3, 9, 'expense', 'Tournament fees', 'Regional League entry', 850],
  [3, 18, 'income', 'Fundraising', 'Car wash fundraiser', 1240],
  [3, 24, 'expense', 'Coaching', 'Head coach stipend, March', 1500],
  [4, 2, 'expense', 'Court hire', 'Main Hall Court 2, April', 1280],
  [4, 11, 'income', 'Membership fees', 'Term 2 subs — 24 players', 7200],
  [4, 19, 'expense', 'Kit', 'Home jerseys, first batch of 15', 2250],
  [4, 26, 'expense', 'Coaching', 'Head coach stipend, April', 1500],
  [5, 6, 'expense', 'Court hire', 'Main Hall Court 2, May', 1280],
  [5, 13, 'expense', 'Travel', 'Coach hire — away fixture at Northside', 420],
  [5, 21, 'income', 'Sponsorship', 'Peninsula Sports — equipment grant', 1800],
  [5, 28, 'expense', 'Coaching', 'Head coach stipend, May', 1500],
  [6, 4, 'expense', 'Court hire', 'Main Hall Court 2, June', 1280],
  [6, 15, 'expense', 'Equipment', 'Ball cart and training cones', 610],
  [6, 23, 'income', 'Fundraising', 'Charity match gate takings', 980],
  [6, 27, 'expense', 'Coaching', 'Head coach stipend, June', 1500],
  [7, 8, 'expense', 'Court hire', 'Main Hall Court 2, July', 1280],
  [7, 16, 'income', 'Membership fees', 'Term 3 subs — 23 players', 6900],
  [7, 25, 'expense', 'Tournament fees', 'Regional Invitational entry', 1100],
  [8, 5, 'expense', 'Court hire', 'Main Hall Court 2, August', 1280],
  [8, 12, 'expense', 'Travel', 'Minibus — Invitational weekend', 760],
  [8, 19, 'expense', 'Admin', 'Insurance renewal', 480],
  [8, 27, 'expense', 'Coaching', 'Head coach stipend, August', 1500],
  [9, 3, 'income', 'Sponsorship', 'Local hardware store — banner', 750],
  [9, 9, 'expense', 'Court hire', 'Main Hall Court 2, September', 1280],
];

export const seedFinanceEntries: FinanceEntry[] = financeSeeds
  .filter(([month]) => month <= now.getUTCMonth() + 1)
  .map(([month, day, kind, category, description, amount], i) => ({
    id: id('22000000', i + 1),
    entry_date: dateOnly(month, day),
    kind,
    category,
    description,
    amount,
    created_by: PROFILE_IDS.treasurer,
    created_at: `${dateOnly(month, day)}T10:00:00.000Z`,
    updated_at: `${dateOnly(month, day)}T10:00:00.000Z`,
  }));
