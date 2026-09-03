import { CURRENCY, LOCALE, TIME_ZONE } from './config';

/* ------------------------------------------------------------------ */
/* Money                                                               */
/* ------------------------------------------------------------------ */

export function money(value: number | string | null | undefined): string {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

/** Compact form for chart axes: 12.4k, 1.2M. */
export function moneyCompact(value: number): string {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export function signedMoney(value: number): string {
  return `${value < 0 ? '−' : ''}${money(Math.abs(value))}`;
}

/* ------------------------------------------------------------------ */
/* Dates: always rendered in the academy's configured time zone so    */
/* server and client agree and nothing hydrates differently.           */
/* ------------------------------------------------------------------ */

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, ...opts });

export const formatDate = (iso: string) =>
  fmt({ day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));

export const formatDateLong = (iso: string) =>
  fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

export const formatTime = (iso: string) =>
  fmt({ hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

export const formatDateTime = (iso: string) =>
  `${formatDate(iso)} · ${formatTime(iso)}`;

export const formatMonth = (iso: string) =>
  fmt({ month: 'long', year: 'numeric' }).format(new Date(iso));

export const MONTH_NAMES = Array.from({ length: 12 }, (_, i) =>
  new Intl.DateTimeFormat(LOCALE, { month: 'short', timeZone: 'UTC' }).format(Date.UTC(2024, i, 1)),
);

/** Whole years between a date of birth and today. */
export function age(dob: string | null): number | null {
  if (!dob) return null;
  const born = new Date(dob);
  if (Number.isNaN(born.getTime())) return null;
  const now = new Date();
  let years = now.getUTCFullYear() - born.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - born.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < born.getUTCDate())) years -= 1;
  return years >= 0 && years < 130 ? years : null;
}

export function relativeDay(iso: string): string | null {
  const target = dayKey(new Date(iso));
  const today = dayKey(new Date());
  const diff = Math.round((Date.parse(target) - Date.parse(today)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return null;
}

/** yyyy-mm-dd in the academy time zone. Used as a calendar cell key. */
export function dayKey(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Offset of the academy time zone at a given instant, in minutes. */
function zoneOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  );
  return (asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60_000;
}

/** ISO instant -> value for an <input type="datetime-local">. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const shifted = new Date(d.getTime() + zoneOffsetMinutes(d) * 60_000);
  return shifted.toISOString().slice(0, 16);
}

/** Value from an <input type="datetime-local"> -> ISO instant. */
export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const naive = new Date(`${value}:00Z`);
  if (Number.isNaN(naive.getTime())) return null;
  // Two passes settle the DST boundary case.
  let guess = new Date(naive.getTime() - zoneOffsetMinutes(naive) * 60_000);
  guess = new Date(naive.getTime() - zoneOffsetMinutes(guess) * 60_000);
  return guess.toISOString();
}

/** Today's date as yyyy-mm-dd, for date input defaults. */
export const todayInput = () => dayKey(new Date());

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
