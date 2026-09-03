import type {
  AcademyEvent,
  Announcement,
  AppRole,
  AttendanceRow,
  EventRsvp,
  FinanceEntry,
  MatchStat,
  Player,
  Profile,
} from '@/lib/types';
import {
  canManageFinance,
  canManageRoster,
  canPostAnnouncements,
  canViewFinance,
  isOwner,
  isStaff,
} from '@/lib/roles';
import {
  seedAnnouncements,
  seedAttendance,
  seedEvents,
  seedFinanceEntries,
  seedMatchStats,
  seedPlayers,
  seedProfiles,
  seedRsvps,
} from './seed';

/**
 * In-memory stand-in for the Postgres database, used only in demo mode.
 *
 * It mirrors the RLS policies from supabase/migrations/0001_init.sql rather
 * than serving every row to everyone. Otherwise the demo would misrepresent
 * the thing the app is most careful about. Writes live in the Node process:
 * they survive navigation, and are lost on restart.
 */

export type DemoDb = {
  profiles: Profile[];
  players: Player[];
  events: AcademyEvent[];
  event_rsvps: EventRsvp[];
  attendance: AttendanceRow[];
  match_stats: MatchStat[];
  announcements: Announcement[];
  finance_entries: FinanceEntry[];
};

const clone = <T,>(rows: T[]): T[] => rows.map((r) => ({ ...r }));

function freshDb(): DemoDb {
  return {
    profiles: clone(seedProfiles),
    players: clone(seedPlayers),
    events: clone(seedEvents),
    event_rsvps: clone(seedRsvps),
    attendance: clone(seedAttendance),
    match_stats: clone(seedMatchStats),
    announcements: clone(seedAnnouncements),
    finance_entries: clone(seedFinanceEntries),
  };
}

// Survives hot reloads in dev, which would otherwise wipe demo edits on
// every file save.
const globalForDemo = globalThis as unknown as { __ubeDemoDb?: DemoDb };
export const db: DemoDb = (globalForDemo.__ubeDemoDb ??= freshDb());

export type DemoContext = { userId: string | null; role: AppRole | null };

export function contextFor(userId: string | null): DemoContext {
  if (!userId) return { userId: null, role: null };
  const profile = db.profiles.find((p) => p.id === userId && p.is_active);
  return { userId, role: profile?.role ?? null };
}

const myPlayerId = (ctx: DemoContext) =>
  db.players.find((p) => p.profile_id === ctx.userId)?.id ?? null;

/* ------------------------------------------------------------------ */
/* Derived views                                                       */
/* ------------------------------------------------------------------ */

const num = (v: number | string) => (typeof v === 'string' ? Number(v) : v);

function financeMonthly() {
  const buckets = new Map<string, { year: number; month_number: number; income: number; expenses: number; count: number }>();
  for (const e of db.finance_entries) {
    const year = Number(e.entry_date.slice(0, 4));
    const month_number = Number(e.entry_date.slice(5, 7));
    const key = `${year}-${month_number}`;
    const bucket = buckets.get(key) ?? { year, month_number, income: 0, expenses: 0, count: 0 };
    if (e.kind === 'income') bucket.income += num(e.amount);
    else bucket.expenses += num(e.amount);
    bucket.count += 1;
    buckets.set(key, bucket);
  }
  return Array.from(buckets.values()).map((b) => ({
    month: `${b.year}-${String(b.month_number).padStart(2, '0')}-01`,
    year: b.year,
    month_number: b.month_number,
    income: b.income,
    expenses: b.expenses,
    net: b.income - b.expenses,
    entry_count: b.count,
  }));
}

function financeYearly() {
  const buckets = new Map<number, { income: number; expenses: number; count: number }>();
  for (const e of db.finance_entries) {
    const year = Number(e.entry_date.slice(0, 4));
    const bucket = buckets.get(year) ?? { income: 0, expenses: 0, count: 0 };
    if (e.kind === 'income') bucket.income += num(e.amount);
    else bucket.expenses += num(e.amount);
    bucket.count += 1;
    buckets.set(year, bucket);
  }
  return Array.from(buckets.entries()).map(([year, b]) => ({
    year,
    income: b.income,
    expenses: b.expenses,
    net: b.income - b.expenses,
    entry_count: b.count,
  }));
}

function financeByCategory() {
  const buckets = new Map<string, { year: number; kind: string; category: string; total: number }>();
  for (const e of db.finance_entries) {
    const year = Number(e.entry_date.slice(0, 4));
    const key = `${year}|${e.kind}|${e.category}`;
    const bucket = buckets.get(key) ?? { year, kind: e.kind, category: e.category, total: 0 };
    bucket.total += num(e.amount);
    buckets.set(key, bucket);
  }
  return Array.from(buckets.values());
}

function attendanceStats() {
  return db.players.map((player) => {
    const rows = db.attendance.filter((a) => a.player_id === player.id);
    const present = rows.filter((a) => a.status === 'present').length;
    const absent = rows.filter((a) => a.status === 'absent').length;
    const excused = rows.filter((a) => a.status === 'excused').length;
    const counted = present + absent;
    return {
      player_id: player.id,
      logged: rows.length,
      present,
      absent,
      excused,
      attendance_pct: counted === 0 ? null : Math.round((100 * present) / counted),
    };
  });
}

function publicEvents() {
  const cutoff = Date.now() - 86_400_000;
  return db.events
    .filter((e) => e.is_public && Date.parse(e.starts_at) >= cutoff)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
    .map(({ id, title, type, starts_at, location }) => ({ id, title, type, starts_at, location }));
}

/* ------------------------------------------------------------------ */
/* Read policy: mirrors the RLS SELECT policies                      */
/* ------------------------------------------------------------------ */

export function readTable(table: string, ctx: DemoContext): Record<string, unknown>[] {
  const role = ctx.role;

  // The one thing an anonymous visitor may read.
  if (table === 'public_events') return publicEvents();
  if (!role) return [];

  switch (table) {
    case 'profiles':
      return isStaff(role) ? db.profiles : db.profiles.filter((p) => p.id === ctx.userId);

    case 'players':
      return isStaff(role) ? db.players : db.players.filter((p) => p.profile_id === ctx.userId);

    case 'events':
      return db.events.filter((e) => e.visible_to_roles.includes(role));

    case 'announcements':
      return db.announcements.filter((a) => a.visible_to_roles.includes(role));

    case 'event_rsvps': {
      if (!isStaff(role)) return db.event_rsvps.filter((r) => r.profile_id === ctx.userId);
      const visible = new Set(
        db.events.filter((e) => e.visible_to_roles.includes(role)).map((e) => e.id),
      );
      return db.event_rsvps.filter((r) => r.profile_id === ctx.userId || visible.has(r.event_id));
    }

    case 'attendance': {
      if (isStaff(role)) return db.attendance;
      const mine = myPlayerId(ctx);
      return mine ? db.attendance.filter((a) => a.player_id === mine) : [];
    }

    case 'match_stats': {
      if (isStaff(role)) return db.match_stats;
      const mine = myPlayerId(ctx);
      return mine ? db.match_stats.filter((s) => s.player_id === mine) : [];
    }

    // Financial tables and views: treasurer, exco, admin only.
    case 'finance_entries':
      return canViewFinance(role) ? db.finance_entries : [];
    case 'finance_monthly_summary':
      return canViewFinance(role) ? financeMonthly() : [];
    case 'finance_yearly_summary':
      return canViewFinance(role) ? financeYearly() : [];
    case 'finance_category_summary':
      return canViewFinance(role) ? financeByCategory() : [];

    case 'player_attendance_stats': {
      if (isStaff(role)) return attendanceStats();
      const mine = myPlayerId(ctx);
      return mine ? attendanceStats().filter((s) => s.player_id === mine) : [];
    }

    default:
      return [];
  }
}

/* ------------------------------------------------------------------ */
/* Write policy: mirrors the RLS INSERT/UPDATE/DELETE policies       */
/* ------------------------------------------------------------------ */

/** Returns null when allowed, or a Postgres-shaped error when not. */
export function checkWrite(
  table: string,
  ctx: DemoContext,
  row?: Record<string, unknown>,
): { message: string; code: string } | null {
  const denied = {
    message: 'new row violates row-level security policy',
    code: '42501',
  };
  const role = ctx.role;
  if (!role) return denied;

  switch (table) {
    case 'finance_entries':
      return canManageFinance(role) ? null : denied;
    case 'players':
    case 'events':
    case 'attendance':
    case 'match_stats':
      return canManageRoster(role) ? null : denied;
    case 'announcements':
      return canPostAnnouncements(role) ? null : denied;
    case 'event_rsvps':
      return row && row.profile_id !== ctx.userId ? denied : null;
    case 'profiles':
      return row && row.id !== ctx.userId && !isOwner(role) ? denied : null;
    default:
      return denied;
  }
}

/** Tables that can actually be mutated. Views cannot. */
export function tableRows(table: string): Record<string, unknown>[] | null {
  if (table in db) return db[table as keyof DemoDb] as unknown as Record<string, unknown>[];
  return null;
}

export function resetDemoDb() {
  Object.assign(db, freshDb());
}
