import type {
  AcademyEvent,
  Announcement,
  AttendanceRow,
  EventRsvp,
  FinanceEntry,
  MatchStat,
  Player,
  Profile,
  Squad,
} from '@/lib/types';
import { PROFILE_IDS } from './accounts';

/**
 * A plausible UBE Academy, generated relative to today so the calendar and
 * the yearly statement always look current. Amounts are in rufiyaa.
 *
 * The academy runs a boys squad and a girls squad. Practices and fixtures
 * belong to one or the other, while meetings, the Invitational and the squad
 * night belong to the whole academy.
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
/* Profiles: one per role, plus a couple of extra players              */
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
    full_name: 'Ahmed Nashid',
    role: 'admin',
    phone: '+960 777 4412',
  },
  {
    ...profileBase,
    id: PROFILE_IDS.treasurer,
    email: 'treasurer@ube.academy',
    full_name: 'Aishath Leen',
    role: 'treasurer',
    phone: '+960 795 2208',
  },
  {
    ...profileBase,
    id: PROFILE_IDS.exco,
    email: 'exco@ube.academy',
    full_name: 'Ibrahim Rifau',
    role: 'exco',
    phone: null,
  },
  {
    ...profileBase,
    id: PROFILE_IDS.coach,
    email: 'coach@ube.academy',
    full_name: 'Hassan Niyaz',
    role: 'coach',
    phone: '+960 771 9036',
  },
  {
    ...profileBase,
    id: PROFILE_IDS.player,
    email: 'player@ube.academy',
    full_name: 'Mohamed Sirajj',
    role: 'player',
    phone: '+960 794 6651',
  },
  {
    ...profileBase,
    id: PROFILE_IDS.player2,
    email: 'zaha@ube.academy',
    full_name: 'Mariyam Zaha',
    role: 'player',
    phone: null,
  },
  {
    ...profileBase,
    id: PROFILE_IDS.player3,
    email: 'shamaan@ube.academy',
    full_name: 'Ali Shamaan',
    role: 'player',
    phone: null,
    must_set_password: true, // shows the "Password not set" state in Accounts
  },
];

/* ------------------------------------------------------------------ */
/* Players, split across the two squads                                */
/* ------------------------------------------------------------------ */

type PlayerSeed = [
  name: string,
  squad: Squad,
  jersey: number,
  position: string,
  height: number,
  weight: number,
  dob: string,
  linkedProfile?: string,
];

const playerSeeds: PlayerSeed[] = [
  ['Mohamed Sirajj', 'boys', 7, 'Outside Hitter', 181, 72, '2006-04-12', PROFILE_IDS.player],
  ['Mariyam Zaha', 'girls', 3, 'Setter', 169, 60, '2005-09-30', PROFILE_IDS.player2],
  ['Ali Shamaan', 'boys', 11, 'Middle Blocker', 191, 81, '2005-01-25', PROFILE_IDS.player3],
  ['Aminath Rifga', 'girls', 5, 'Libero', 162, 54, '2009-06-08'],
  ['Yoosuf Zayan', 'boys', 9, 'Opposite', 186, 77, '2006-11-14'],
  ['Fathimath Shiuna', 'girls', 1, 'Setter', 171, 62, '2007-02-19'],
  ['Hawwa Nashwa', 'girls', 14, 'Outside Hitter', 174, 63, '2008-08-03'],
  ['Adam Naseer', 'boys', 8, 'Middle Blocker', 189, 79, '2005-12-07'],
  ['Sharufa Ismail', 'girls', 6, 'Defensive Specialist', 165, 56, '2009-03-22'],
  ['Hussain Areef', 'boys', 12, 'Opposite', 184, 75, '2006-05-16'],
  ['Aishath Zoya', 'girls', 4, 'Outside Hitter', 176, 65, '2007-10-09'],
  ['Ismail Nahil', 'boys', 2, 'Libero', 170, 64, '2005-07-28'],
  ['Ahmed Maail', 'boys', 10, 'Middle Blocker', 187, 76, '2005-09-11'],
  ['Nashfa Adam', 'girls', 15, 'Outside Hitter', 173, 62, '2008-01-05'],
];

/** Guardian details only make sense for the handful of players under 18. */
const UNDER_18_CUTOFF = new Date(
  Date.UTC(now.getUTCFullYear() - 18, now.getUTCMonth(), now.getUTCDate()),
)
  .toISOString()
  .slice(0, 10);

export const seedPlayers: Player[] = playerSeeds.map(
  (
    [full_name, squad, jersey_number, position, height_cm, weight_kg, date_of_birth, profile_id],
    i,
  ) => {
    const minor = date_of_birth > UNDER_18_CUTOFF;
    return {
      id: id('b0000000', i + 1),
      profile_id: profile_id ?? null,
      full_name,
      jersey_number,
      position,
      height_cm,
      weight_kg,
      date_of_birth,
      email: `${full_name.split(' ')[0].toLowerCase()}@example.com`,
      phone: i % 3 === 0 ? `+960 79${String(10000 + i * 977).slice(0, 5)}` : null,
      guardian_name: minor ? `${full_name.split(' ')[1]} (parent)` : null,
      guardian_phone: minor ? '+960 776 3320' : null,
      notes:
        i === 0
          ? 'Strong line shot. Working on back-row discipline, tends to drift left on serve receive.'
          : i === 2
            ? 'Cleared to return after an ankle sprain. Ease back into full jump load over two weeks.'
            : null,
      squad,
      is_active: i < 13,
      created_at: iso(-200 + i, 10),
      updated_at: iso(-30, 10),
    };
  },
);

const playersInSquad = (squad: Squad | null) =>
  seedPlayers.filter((p) => p.is_active && (squad === null || p.squad === squad));

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

const ALL_ROLES_ARR = ['admin', 'treasurer', 'exco', 'coach', 'player'] as const;
const COMMITTEE_ONLY = ['admin', 'coach', 'treasurer', 'exco'] as const;

const HOME = 'Hulhumalé Sports Complex, Court 1';
const YOUTH_CENTRE = 'Hulhumalé Youth Centre';

type EventSeed = {
  title: string;
  type: AcademyEvent['type'];
  offset: number;
  hour: number;
  durationH?: number;
  location: string;
  description?: string;
  roles?: readonly string[];
  squad?: Squad;
  isPublic?: boolean;
};

/** The girls train first, the boys take the later slot. */
const practice = (title: string, squad: Squad, offset: number): EventSeed => ({
  title,
  type: 'practice',
  offset,
  hour: squad === 'girls' ? 18 : 20,
  durationH: 2,
  location: HOME,
  squad,
});

const eventSeeds: EventSeed[] = [
  practice('Girls practice', 'girls', -21),
  practice('Boys practice', 'boys', -21),
  practice('Girls practice', 'girls', -19),
  practice('Boys practice', 'boys', -19),
  {
    title: 'Boys friendly vs Vilimalé VC',
    type: 'match',
    offset: -14,
    hour: 16,
    durationH: 3,
    location: 'Vilimalé Court',
    description:
      'Bring both kits. Ferry leaves the Hulhumalé terminal 90 minutes before first serve.',
    squad: 'boys',
    isPublic: true,
  },
  practice('Girls practice', 'girls', -14),
  practice('Girls practice', 'girls', -12),
  practice('Boys practice', 'boys', -12),
  {
    title: 'ExCo monthly meeting',
    type: 'meeting',
    offset: -10,
    hour: 21,
    durationH: 1,
    location: YOUTH_CENTRE,
    description: 'Budget review, kit order, tournament entry deadlines.',
    roles: COMMITTEE_ONLY,
  },
  practice('Girls practice', 'girls', -7),
  practice('Boys practice', 'boys', -7),
  {
    title: 'Girls friendly vs Malé City VC',
    type: 'match',
    offset: -6,
    hour: 16,
    durationH: 3,
    location: HOME,
    description: 'Home fixture. Warm-up 45 minutes before first serve.',
    squad: 'girls',
    isPublic: true,
  },
  {
    title: 'Academy conditioning session',
    type: 'practice',
    offset: -3,
    hour: 18,
    durationH: 1,
    location: YOUTH_CENTRE,
    description: 'Both squads together. Lower-body strength and landing mechanics, no ball work.',
  },
  practice('Girls practice', 'girls', 1),
  practice('Boys practice', 'boys', 1),
  practice('Girls practice', 'girls', 3),
  {
    title: 'Boys practice',
    type: 'practice',
    offset: 3,
    hour: 20,
    durationH: 2,
    location: HOME,
    description: 'Serve receive focus. Full squad expected.',
    squad: 'boys',
  },
  {
    title: 'Girls league match vs Malé City VC',
    type: 'match',
    offset: 6,
    hour: 17,
    durationH: 3,
    location: HOME,
    description: 'Home fixture. Meet 90 minutes before first serve for warm-up and court setup.',
    squad: 'girls',
    isPublic: true,
  },
  {
    title: 'Boys league match vs Vilimalé VC',
    type: 'match',
    offset: 8,
    hour: 17,
    durationH: 3,
    location: HOME,
    description: 'Home fixture. Meet 90 minutes before first serve.',
    squad: 'boys',
    isPublic: true,
  },
  {
    title: 'ExCo budget planning',
    type: 'meeting',
    offset: 9,
    hour: 21,
    durationH: 1,
    location: YOUTH_CENTRE,
    description: 'Half-year figures and the kit reorder decision.',
    roles: COMMITTEE_ONLY,
  },
  practice('Girls practice', 'girls', 10),
  practice('Boys practice', 'boys', 10),
  {
    title: 'Inter-Island Invitational',
    type: 'tournament',
    offset: 17,
    hour: 9,
    durationH: 9,
    location: 'Malé Sports Complex',
    description:
      'Both squads travel. Pool games on the Saturday, knockouts on the Sunday. Ferry times to follow.',
    isPublic: true,
  },
  {
    title: 'Squad night and kit handout',
    type: 'event',
    offset: 24,
    hour: 20,
    durationH: 3,
    location: YOUTH_CENTRE,
    description: 'End-of-season dinner for both squads. Plus ones welcome.',
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
  squad: e.squad ?? null,
  rsvp_enabled: e.type !== 'meeting',
  is_public: e.isPublic ?? false,
  created_by: e.type === 'meeting' ? PROFILE_IDS.exco : PROFILE_IDS.coach,
  created_by_name: e.type === 'meeting' ? 'Ibrahim Rifau' : 'Hassan Niyaz',
  created_at: iso(e.offset - 14, 12),
  updated_at: iso(e.offset - 14, 12),
}));

/* ------------------------------------------------------------------ */
/* Attendance: past events only, and only for the squad that was there */
/* ------------------------------------------------------------------ */

const pastEvents = seedEvents.filter(
  (e) => Date.parse(e.starts_at) < now.getTime() && e.type !== 'meeting',
);

export const seedAttendance: AttendanceRow[] = pastEvents.flatMap((event, ei) =>
  playersInSquad(event.squad).map((player, pi) => {
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
/* Match stats: one past fixture per squad                             */
/* ------------------------------------------------------------------ */

const POINTS = [14, 3, 11, 2, 16, 4, 9] as const;
const KILLS = [11, 1, 8, 0, 13, 2, 7] as const;
const BLOCKS = [1, 0, 3, 0, 2, 1, 1] as const;
const ACES = [2, 2, 0, 2, 1, 1, 1] as const;
const DIGS = [9, 6, 3, 18, 4, 7, 8] as const;
const ASSISTS = [2, 31, 1, 4, 1, 27, 2] as const;
const SERVE_ERRORS = [1, 0, 2, 0, 3, 1, 0] as const;

const pastMatches = pastEvents.filter((e) => e.type === 'match');

export const seedMatchStats: MatchStat[] = pastMatches.flatMap((match, mi) =>
  playersInSquad(match.squad)
    .slice(0, 7)
    .map((player, i) => ({
      id: id('e0000000', mi * 20 + i + 1),
      event_id: match.id,
      player_id: player.id,
      points: POINTS[i],
      kills: KILLS[i],
      blocks: BLOCKS[i],
      aces: ACES[i],
      digs: DIGS[i],
      assists: ASSISTS[i],
      serve_errors: SERVE_ERRORS[i],
      notes: i === 0 ? 'Best match of the season so far.' : null,
      recorded_by: PROFILE_IDS.coach,
      created_at: match.starts_at,
    })),
);

/* ------------------------------------------------------------------ */
/* RSVPs, from people who can actually see the event                   */
/* ------------------------------------------------------------------ */

const SQUAD_MEMBER: Record<Squad, string> = {
  boys: PROFILE_IDS.player,
  girls: PROFILE_IDS.player2,
};

const upcoming = seedEvents.filter(
  (e) => Date.parse(e.starts_at) >= now.getTime() && e.rsvp_enabled,
);

export const seedRsvps: EventRsvp[] = upcoming.flatMap((event, ei) => {
  const audience = event.squad
    ? [SQUAD_MEMBER[event.squad], PROFILE_IDS.coach, PROFILE_IDS.exco]
    : [PROFILE_IDS.player, PROFILE_IDS.player2, PROFILE_IDS.coach, PROFILE_IDS.exco];

  return audience.map((profile_id, pi) => ({
    id: id('f0000000', ei * 10 + pi + 1),
    event_id: event.id,
    profile_id,
    status: (['going', 'going', 'maybe', 'going', 'not_going'] as const)[(ei + pi) % 5],
    updated_at: iso(-1, 12),
  }));
});

/* ------------------------------------------------------------------ */
/* Announcements                                                       */
/* ------------------------------------------------------------------ */

export const seedAnnouncements: Announcement[] = [
  {
    id: id('11000000', 1),
    title: 'Inter-Island Invitational: travel and kit',
    body: 'Both squads are travelling. Coach will confirm the travelling groups after Thursday practice.\n\nFerry from the Hulhumalé terminal at 06:45 sharp on the Saturday. Bring both kits, a spare pair of shoes and your own water bottle. Lunch is provided at the venue, bring cash for dinner.\n\nIf you cannot make either day, tell Hassan before Thursday so we can plan rotations.',
    pinned: true,
    visible_to_roles: [...ALL_ROLES_ARR],
    squad: null,
    author_id: PROFILE_IDS.coach,
    author_name: 'Hassan Niyaz',
    created_at: iso(-2, 21),
    updated_at: iso(-2, 21),
  },
  {
    id: id('11000000', 2),
    title: 'Subs due by the end of the month',
    body: 'Term subs are due by the 30th. Bank transfer is easiest, reference your name and jersey number so Leen can reconcile it.\n\nIf paying is a problem this term, message a committee member privately. We would rather sort it out quietly than have anyone drop out.',
    pinned: true,
    visible_to_roles: [...ALL_ROLES_ARR],
    squad: null,
    author_id: PROFILE_IDS.treasurer,
    author_name: 'Aishath Leen',
    created_at: iso(-5, 18),
    updated_at: iso(-5, 18),
  },
  {
    id: id('11000000', 3),
    title: 'Boys squad: serve receive is our weak point',
    body: 'We lost 11 points off serve receive against Vilimalé. That is the single biggest thing between us and a top-three finish.\n\nThe next three boys practices open with 25 minutes of passing under pressure. It will be repetitive and it will be boring. Do it anyway.',
    pinned: false,
    visible_to_roles: [...ALL_ROLES_ARR],
    squad: 'boys',
    author_id: PROFILE_IDS.coach,
    author_name: 'Hassan Niyaz',
    created_at: iso(-4, 22),
    updated_at: iso(-4, 22),
  },
  {
    id: id('11000000', 4),
    title: 'Girls squad: rotation change for the league match',
    body: 'We are moving to a 5-1 for the Malé City fixture. Shiuna sets all six rotations, Zaha moves to the right side.\n\nWe will walk through it at Tuesday practice. Come with questions rather than saving them for the warm-up.',
    pinned: false,
    visible_to_roles: [...ALL_ROLES_ARR],
    squad: 'girls',
    author_id: PROFILE_IDS.coach,
    author_name: 'Hassan Niyaz',
    created_at: iso(-3, 21),
    updated_at: iso(-3, 21),
  },
  {
    id: id('11000000', 5),
    title: 'Kit reorder: decision needed before Friday',
    body: 'Two quotes are in. The cheaper supplier is 18% under budget but has a six-week lead time, which lands after the Invitational.\n\nBudget breakdown is in the Financials tab. Please read it before the meeting so we can decide in ten minutes rather than forty.',
    pinned: false,
    visible_to_roles: [...COMMITTEE_ONLY],
    squad: null,
    author_id: PROFILE_IDS.exco,
    author_name: 'Ibrahim Rifau',
    created_at: iso(-6, 14),
    updated_at: iso(-6, 14),
  },
  {
    id: id('11000000', 6),
    title: 'Court 1 booking confirmed through the season',
    body: 'We have Court 1 at the Hulhumalé Sports Complex locked in for Tuesdays and Thursdays for the rest of the season. Girls take 18:00 to 20:00, boys take 20:00 to 22:00.\n\nThe complex closes its doors at 22:15, so the boys squad especially needs to help pack down promptly.',
    pinned: false,
    visible_to_roles: [...ALL_ROLES_ARR],
    squad: null,
    author_id: PROFILE_IDS.exco,
    author_name: 'Ibrahim Rifau',
    created_at: iso(-11, 10),
    updated_at: iso(-11, 10),
  },
];

/* ------------------------------------------------------------------ */
/* Finance. Amounts in rufiyaa.                                        */
/* ------------------------------------------------------------------ */

type FinanceSeed = [
  month: number,
  day: number,
  kind: 'income' | 'expense',
  category: string,
  description: string,
  amount: number,
];

const financeSeeds: FinanceSeed[] = [
  [1, 12, 'income', 'Membership fees', 'Term 1 subs, 22 players', 33000],
  [1, 15, 'expense', 'Court hire', 'Sports Complex Court 1, January', 4800],
  [1, 20, 'expense', 'Equipment', 'Replacement balls (12) and net tension kit', 6400],
  [2, 5, 'expense', 'Court hire', 'Sports Complex Court 1, February', 4800],
  [2, 14, 'income', 'Sponsorship', 'Reef Side Café, season sponsorship', 25000],
  [2, 22, 'expense', 'Coaching', 'Head coach stipend, February', 8000],
  [3, 3, 'expense', 'Court hire', 'Sports Complex Court 1, March', 4800],
  [3, 9, 'expense', 'Tournament fees', 'Domestic league entry, both squads', 6500],
  [3, 18, 'income', 'Fundraising', 'Bake sale and raffle at the Youth Centre', 9200],
  [3, 24, 'expense', 'Coaching', 'Head coach stipend, March', 8000],
  [4, 2, 'expense', 'Court hire', 'Sports Complex Court 1, April', 4800],
  [4, 11, 'income', 'Membership fees', 'Term 2 subs, 24 players', 36000],
  [4, 19, 'expense', 'Kit', 'Home jerseys, first batch of 15', 18500],
  [4, 26, 'expense', 'Coaching', 'Head coach stipend, April', 8000],
  [5, 6, 'expense', 'Court hire', 'Sports Complex Court 1, May', 4800],
  [5, 13, 'expense', 'Travel', 'Ferry and transport, boys away fixture at Vilimalé', 2400],
  [5, 21, 'income', 'Sponsorship', 'Island Sports Supplies, equipment grant', 14000],
  [5, 28, 'expense', 'Coaching', 'Head coach stipend, May', 8000],
  [6, 4, 'expense', 'Court hire', 'Sports Complex Court 1, June', 4800],
  [6, 15, 'expense', 'Equipment', 'Ball cart and training cones', 5200],
  [6, 23, 'income', 'Fundraising', 'Charity match gate takings', 7800],
  [6, 27, 'expense', 'Coaching', 'Head coach stipend, June', 8000],
  [7, 8, 'expense', 'Court hire', 'Sports Complex Court 1, July', 4800],
  [7, 16, 'income', 'Membership fees', 'Term 3 subs, 23 players', 34500],
  [7, 25, 'expense', 'Tournament fees', 'Inter-Island Invitational entry, both squads', 9000],
  [8, 5, 'expense', 'Court hire', 'Sports Complex Court 1, August', 4800],
  [8, 12, 'expense', 'Travel', 'Ferry charter, Invitational weekend', 6200],
  [8, 19, 'expense', 'Admin', 'Association registration and insurance', 3800],
  [8, 27, 'expense', 'Coaching', 'Head coach stipend, August', 8000],
  [9, 3, 'income', 'Sponsorship', 'Kaashi Mart, court banner', 6000],
  [9, 9, 'expense', 'Court hire', 'Sports Complex Court 1, September', 4800],
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
