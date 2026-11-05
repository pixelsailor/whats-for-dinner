/**
 * @fileoverview Pure helpers for the calendar month view: month arithmetic, the checkout index,
 * month selection, and grid construction.
 * @module lib/api/calendar/calendar.model
 *
 * @remarks Time-zone rule: `checkout_history` values are calendar dates, not instants. Nothing in
 * this module parses a `YYYY-MM-DD` string with `new Date(string)` or serializes through
 * `toISOString()`. Day math uses integers, or `Date` objects built with `setUTCFullYear` and read
 * with `getUTC*`, so results are identical in every runtime time zone. "Today" comes from
 * {@link isoDateToday} (local zone).
 */

import { isoDateToday, toIsoDate } from '$lib/api/recipe/recipe.model';

import { CalendarMonthParamSchema } from './calendar.schemas';
import type {
  CalendarCell,
  CalendarMonth,
  CalendarMonthData,
  CalendarRecipeEntry,
  CalendarWeek,
  CheckoutIndex,
  CheckoutIndexSource
} from './calendar.types';

/** Upper bound on year-selector options so one bad historical date cannot create a huge list. */
export const MAX_YEAR_OPTIONS = 100;

/** Zero-pads to `width` digits. */
const pad = (value: number, width: number): string =>
  String(value).padStart(width, '0');

/**
 * Builds a UTC-midnight `Date` for a calendar day without the two-digit-year quirk of `Date.UTC`.
 * @param year - Full year
 * @param month - 1-12
 * @param day - Day of month (may overflow, e.g. 0 = last day of previous month)
 */
function utcDate(year: number, month: number, day: number): Date {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

/**
 * Formats an ISO calendar date.
 * @param year - Full year
 * @param month - 1-12
 * @param day - 1-31
 */
function toIso(year: number, month: number, day: number): string {
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

/**
 * Parses the `?month=YYYY-MM` URL value.
 * @param raw - Raw search-param value (any type; non-strings are rejected)
 * @param fallback - Returned for missing or invalid input
 * @returns The parsed month, or `fallback`; never throws
 */
export function parseCalendarMonthParam(
  raw: unknown,
  fallback: CalendarMonth
): CalendarMonth {
  const parsed = CalendarMonthParamSchema.safeParse(raw);
  if (!parsed.success) return fallback;
  return {
    year: Number(parsed.data.slice(0, 4)),
    month: Number(parsed.data.slice(5, 7))
  };
}

/**
 * Formats a month as the canonical `?month=` value.
 * @param m - Calendar month
 * @returns `YYYY-MM`
 */
export function formatCalendarMonthParam(m: CalendarMonth): string {
  return `${pad(m.year, 4)}-${pad(m.month, 2)}`;
}

/**
 * Moves a month forward or backward, crossing year boundaries.
 * @param m - Starting month
 * @param delta - Number of months (negative for earlier)
 */
export function shiftCalendarMonth(
  m: CalendarMonth,
  delta: number
): CalendarMonth {
  const total = m.year * 12 + (m.month - 1) + delta;
  const year = Math.floor(total / 12);
  const month = total - year * 12 + 1;
  return { year, month };
}

/**
 * The current month in the local time zone.
 * @param todayIso - ISO date to treat as today (defaults to {@link isoDateToday})
 */
export function getCurrentCalendarMonth(
  todayIso: string = isoDateToday()
): CalendarMonth {
  return {
    year: Number(todayIso.slice(0, 4)),
    month: Number(todayIso.slice(5, 7))
  };
}

/**
 * Number of days in a month (leap years handled).
 * @param m - Calendar month
 */
export function getDaysInCalendarMonth(m: CalendarMonth): number {
  return utcDate(m.year, m.month + 1, 0).getUTCDate();
}

/** Orders entries within a day: title (locale-aware), then id for a stable tie-break. */
function compareEntries(
  a: CalendarRecipeEntry,
  b: CalendarRecipeEntry
): number {
  const byTitle = a.title.localeCompare(b.title);
  if (byTitle !== 0) return byTitle;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Builds the whole-history index from recipes.
 *
 * - Only active recipes are included (`!deleted_at && is_current`, same predicate as the recipe
 *   stores). Deliberately does not import cloud helpers.
 * - Entries are normalized with {@link toIsoDate}; legacy timestamps bucket by their date part and
 *   unparseable values are skipped.
 * - A recipe repeated on the same date appears once for that date.
 * - Memory: one shared `{ id, title }` object per recipe is reused across all of its dates.
 * - Lists are left unsorted; {@link selectCalendarMonth} sorts only the visible days.
 * - Position in `checkout_history` is never used as an ordering signal (dates carry no time).
 *
 * @param recipes - Recipes to index (full rows or slim fixtures)
 * @returns A new index; treat as immutable
 */
export function buildCheckoutIndex(
  recipes: readonly CheckoutIndexSource[]
): CheckoutIndex {
  const index: CheckoutIndex = new Map();

  for (const recipe of recipes) {
    if (recipe.deleted_at || !recipe.is_current) continue;
    const history = recipe.checkout_history;
    if (!history || history.length === 0) continue;

    let entry: CalendarRecipeEntry | undefined;
    const seen = new Set<string>();

    for (const raw of history) {
      const iso = toIsoDate(raw);
      if (iso === null || seen.has(iso)) continue;
      seen.add(iso);

      entry ??= { id: recipe.id, title: recipe.title };
      const day = index.get(iso);
      if (day) {
        day.push(entry);
      } else {
        index.set(iso, [entry]);
      }
    }
  }

  return index;
}

/** `earliestYear` cache keyed by index identity; indexes are immutable once built. */
const earliestYearCache = new WeakMap<object, number | null>();

/**
 * Earliest year with any checkout in the index (lexicographic min works for `YYYY-MM-DD`).
 * Cached per index so month navigation does not rescan the whole history.
 */
function getEarliestYear(index: CheckoutIndex): number | null {
  const cached = earliestYearCache.get(index);
  if (cached !== undefined) return cached;

  let min: string | null = null;
  for (const iso of index.keys()) {
    if (min === null || iso < min) min = iso;
  }
  const year = min === null ? null : Number(min.slice(0, 4));
  earliestYearCache.set(index, year);
  return year;
}

/**
 * Slices one month out of the index.
 *
 * Returns only that month's days, sorts only those day lists (title, then id), and reports the
 * earliest year in the whole index.
 *
 * @param index - Index from {@link buildCheckoutIndex}
 * @param m - Month to select
 */
export function selectCalendarMonth(
  index: CheckoutIndex,
  m: CalendarMonth
): CalendarMonthData {
  const days = new Map<string, CalendarRecipeEntry[]>();
  const total = getDaysInCalendarMonth(m);

  for (let day = 1; day <= total; day++) {
    const iso = toIso(m.year, m.month, day);
    const entries = index.get(iso);
    if (entries && entries.length > 0) {
      days.set(iso, [...entries].sort(compareEntries));
    }
  }

  return { days, earliestYear: getEarliestYear(index) };
}

/**
 * Builds the month grid as weeks of exactly seven cells.
 *
 * Days outside the month are blank `filler` cells (no adjacent-month days).
 *
 * @param m - Month to render
 * @param data - Data from {@link selectCalendarMonth} for the same month
 * @param opts - `todayIso` (defaults to local today) and `weekStart` (0 = Sunday, default; 1 = Monday)
 */
export function buildMonthGrid(
  m: CalendarMonth,
  data: CalendarMonthData,
  opts: { todayIso?: string; weekStart?: 0 | 1 } = {}
): CalendarWeek[] {
  const todayIso = opts.todayIso ?? isoDateToday();
  const weekStart = opts.weekStart ?? 0;

  const firstWeekday = utcDate(m.year, m.month, 1).getUTCDay();
  const leading = (firstWeekday - weekStart + 7) % 7;
  const total = getDaysInCalendarMonth(m);

  const cells: CalendarCell[] = [];
  for (let i = 0; i < leading; i++) cells.push({ kind: 'filler' });

  for (let day = 1; day <= total; day++) {
    const iso = toIso(m.year, m.month, day);
    cells.push({
      kind: 'day',
      day,
      iso,
      isToday: iso === todayIso,
      entries: data.days.get(iso) ?? []
    });
  }

  while (cells.length % 7 !== 0) cells.push({ kind: 'filler' });

  const weeks: CalendarWeek[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/**
 * Years for the year selector, ascending.
 *
 * A contiguous range from the earliest checkout year (or the current year when there is none) to
 * the current year, capped at {@link MAX_YEAR_OPTIONS} most recent years. The viewed year is always
 * included, even when it falls outside that range.
 *
 * @param earliestYear - From {@link CalendarMonthData.earliestYear}
 * @param viewed - The month being viewed
 * @param todayIso - ISO date to treat as today (defaults to local today)
 */
export function getCalendarYearRange(
  earliestYear: number | null,
  viewed: CalendarMonth,
  todayIso: string = isoDateToday()
): number[] {
  const currentYear = getCurrentCalendarMonth(todayIso).year;
  const start = Math.max(
    Math.min(earliestYear ?? currentYear, currentYear),
    currentYear - (MAX_YEAR_OPTIONS - 1)
  );

  const years: number[] = [];
  for (let year = start; year <= currentYear; year++) years.push(year);

  if (!years.includes(viewed.year)) {
    years.push(viewed.year);
    years.sort((a, b) => a - b);
  }
  return years;
}
