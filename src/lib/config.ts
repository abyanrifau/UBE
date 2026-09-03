/** Academy-wide settings. Everything here can be overridden with env vars. */

export const ACADEMY = {
  name: process.env.NEXT_PUBLIC_ACADEMY_NAME ?? 'UBE Academy',
  tagline: process.env.NEXT_PUBLIC_ACADEMY_TAGLINE ?? 'Volleyball, played properly.',
  email: process.env.NEXT_PUBLIC_ACADEMY_EMAIL ?? 'hello@ubeacademy.com',
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? 'https://www.instagram.com/ube.academy/',
  instagramHandle: process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE ?? 'ube.academy',
  location: process.env.NEXT_PUBLIC_ACADEMY_LOCATION ?? '',
} as const;

/** ISO 4217 code used to format every amount in Financials. */
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? 'USD';
/** BCP 47 locale used for dates and numbers. */
export const LOCALE = process.env.NEXT_PUBLIC_LOCALE ?? 'en-US';
/** IANA time zone the calendar is written in. */
export const TIME_ZONE = process.env.NEXT_PUBLIC_TIME_ZONE ?? 'UTC';
