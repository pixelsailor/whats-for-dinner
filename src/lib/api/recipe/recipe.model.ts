/**
 * @fileoverview Pure recipe helpers for checkout-history date normalization.
 * @module lib/api/recipe/recipe.model
 */

import { getLocalTimeZone, today } from '@internationalized/date';
import { z } from 'zod';

/** Canonical persisted checkout date: ISO-8601 calendar date with no time component. */
const IsoDateSchema = z.iso.date();

/**
 * Converts a date or datetime string to an ISO-8601 calendar date (`YYYY-MM-DD`).
 * Timestamp values contribute only their date prefix so midnight-UTC entries keep the authored day.
 * @param value - Raw checkout-history entry or other date-like string
 * @returns Canonical ISO date, or null when the value cannot be interpreted as a date
 */
export function toIsoDate(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const separatorIndex = trimmed.search(/[T\s]/);
  const dateCandidate =
    separatorIndex === -1 ? trimmed : trimmed.slice(0, separatorIndex);

  const direct = IsoDateSchema.safeParse(dateCandidate);
  if (direct.success) return direct.data;

  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) return null;

  const parsed = new Date(ms);
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const fallback = IsoDateSchema.safeParse(`${year}-${month}-${day}`);
  return fallback.success ? fallback.data : null;
}

/**
 * Today's calendar date in the local timezone as `YYYY-MM-DD`.
 * @param timeZone - IANA time zone identifier; defaults to the runtime local zone
 * @returns ISO-8601 date with no timestamp
 */
export function isoDateToday(timeZone: string = getLocalTimeZone()): string {
  return today(timeZone).toString();
}

/**
 * Maps checkout-history entries to ISO-8601 dates and drops values that cannot be repaired.
 * @param history - Persisted checkout dates, which may include timestamps from older clients
 * @returns Normalized date list, or null when history is nullish
 */
export function normalizeCheckoutHistory(
  history: readonly string[] | null | undefined
): string[] | null {
  if (history == null) return null;

  const normalized: string[] = [];
  for (const entry of history) {
    const iso = toIsoDate(entry);
    if (iso !== null) {
      normalized.push(iso);
    }
  }
  return normalized;
}

/**
 * Returns whether checkout history contains any entry that is not a canonical ISO date.
 * @param history - Persisted checkout dates
 * @returns True when a mini-migration write is required
 */
export function checkoutHistoryNeedsNormalization(
  history: readonly string[] | null | undefined
): boolean {
  if (history == null) return false;
  return history.some((entry) => toIsoDate(entry) !== entry);
}
