/**
 * @fileoverview Zod schemas for the calendar month view (URL param and view-model shapes).
 * @module lib/api/calendar/calendar.schemas
 *
 * @remarks These describe **derived, in-memory** view data. Nothing here is persisted to Dexie or
 * synced to the cloud; the durable source is `SavedRecipe.checkout_history`.
 */

import { z } from 'zod';

/** A calendar month. `month` is 1-12 (not a JS month index). */
export const CalendarMonthSchema = z.strictObject({
  year: z.number().int().min(0).max(9999),
  month: z.number().int().min(1).max(12)
});

/** Canonical `?month=` URL value: `YYYY-MM`. */
export const CalendarMonthParamSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/);

/** Minimal recipe reference rendered as a pill. Titles are read live; never persisted. */
export const CalendarRecipeEntrySchema = z.strictObject({
  id: z.uuid(),
  title: z.string()
});

/** Data for a single visible month. */
export const CalendarMonthDataSchema = z.strictObject({
  /** ISO date -> entries, only for days of the requested month; each list sorted by title, then id. */
  days: z.map(z.iso.date(), z.array(CalendarRecipeEntrySchema)),
  /** Earliest year with any checkout, or null when there are none. Drives the year selector. */
  earliestYear: z.number().int().nullable()
});

/** One cell of the month grid. */
export const CalendarCellSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('filler') }),
  z.strictObject({
    kind: z.literal('day'),
    day: z.number().int().min(1).max(31),
    iso: z.iso.date(),
    isToday: z.boolean(),
    entries: z.array(CalendarRecipeEntrySchema)
  })
]);
