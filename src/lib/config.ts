/** Academy-wide settings. Everything here can be overridden with env vars. */

export const ACADEMY = {
  name: process.env.NEXT_PUBLIC_ACADEMY_NAME ?? 'UBE Academy',
  /** What the letters stand for. Shown in the About section. */
  expansion: process.env.NEXT_PUBLIC_ACADEMY_EXPANSION ?? 'United Brotherhood of Excellence',
  tagline: process.env.NEXT_PUBLIC_ACADEMY_TAGLINE ?? 'Train hard. Play together.',
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? 'https://www.instagram.com/ube.academy/',
  instagramHandle: process.env.NEXT_PUBLIC_INSTAGRAM_HANDLE ?? 'ube.academy',
  location: process.env.NEXT_PUBLIC_ACADEMY_LOCATION ?? 'Hulhumalé, Maldives',
  /** Google Form used to apply for a place in the squad. */
  joinFormUrl:
    process.env.NEXT_PUBLIC_JOIN_FORM_URL ??
    'https://docs.google.com/forms/d/e/1FAIpQLSfBMTfTfYtKApB1SB-rkY3sCxN1xp1ojpWv1NfqqRE8FVRyjA/viewform',
} as const;

/** ISO 4217 code used to format every amount in Financials. */
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? 'MVR';
/** BCP 47 locale used for dates and numbers. en-MV renders rufiyaa as "Rf". */
export const LOCALE = process.env.NEXT_PUBLIC_LOCALE ?? 'en-MV';
/** IANA time zone the calendar is written in. */
export const TIME_ZONE = process.env.NEXT_PUBLIC_TIME_ZONE ?? 'Indian/Maldives';
