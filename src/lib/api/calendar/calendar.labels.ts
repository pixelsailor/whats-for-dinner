/**
 * @fileoverview Display labels (month and weekday names) for the calendar month view.
 * @module lib/api/calendar/calendar.labels
 *
 * @remarks Uses `DateFormatter` from `@internationalized/date`. Dates are built as UTC calendar days
 * and formatted with `timeZone: 'UTC'`, so names never shift with the runtime time zone.
 *
 * The locale is fixed (not read from `navigator`) because the route is server-rendered: a
 * browser-dependent locale would produce different text on the server and in the browser and
 * cause hydration mismatches. The app UI is English-only today.
 */

import { CalendarDate, DateFormatter } from '@internationalized/date';

import type { CalendarMonth } from './calendar.types';

/** Locale for all calendar labels. */
export const CALENDAR_LOCALE = 'en-US';

/** Names for one weekday column header. */
export type WeekdayLabel = {
  /** e.g. "Wednesday" — exposed to assistive technology. */
  long: string;
  /** e.g. "Wed" — shown from the `sm` breakpoint up. */
  short: string;
  /** e.g. "W" — shown below the `sm` breakpoint. */
  narrow: string;
};

/** Converts a calendar day to a UTC-midnight `Date` suitable for UTC-zoned formatting. */
const toUtcDate = (year: number, month: number, day: number): Date =>
  new CalendarDate(year, month, day).toDate('UTC');

/**
 * Month heading, e.g. "November 2026".
 * @param m - Calendar month
 * @param locale - BCP 47 locale (defaults to {@link CALENDAR_LOCALE})
 */
export function formatCalendarMonthLabel(
  m: CalendarMonth,
  locale: string = CALENDAR_LOCALE
): string {
  return new DateFormatter(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(toUtcDate(m.year, m.month, 1));
}

/**
 * The twelve month names, January first.
 * @param locale - BCP 47 locale (defaults to {@link CALENDAR_LOCALE})
 */
export function getMonthNames(locale: string = CALENDAR_LOCALE): string[] {
  const formatter = new DateFormatter(locale, {
    month: 'long',
    timeZone: 'UTC'
  });
  return Array.from({ length: 12 }, (_, i) =>
    formatter.format(toUtcDate(2023, i + 1, 1))
  );
}

/**
 * Weekday column headers in display order.
 * @param weekStart - 0 = Sunday-first (default), 1 = Monday-first; must match `buildMonthGrid`
 * @param locale - BCP 47 locale (defaults to {@link CALENDAR_LOCALE})
 */
export function getWeekdayLabels(
  weekStart: 0 | 1 = 0,
  locale: string = CALENDAR_LOCALE
): WeekdayLabel[] {
  const make = (weekday: 'long' | 'short' | 'narrow') =>
    new DateFormatter(locale, { weekday, timeZone: 'UTC' });
  const long = make('long');
  const short = make('short');
  const narrow = make('narrow');

  // 2023-01-01 is a Sunday.
  return Array.from({ length: 7 }, (_, i) => {
    const date = toUtcDate(2023, 1, 1 + ((i + weekStart) % 7));
    return {
      long: long.format(date),
      short: short.format(date),
      narrow: narrow.format(date)
    };
  });
}
