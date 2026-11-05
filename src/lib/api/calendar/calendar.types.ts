/**
 * Calendar Types
 *
 * Types for the calendar month view. Inferred from {@link ./calendar.schemas}.
 */

import { z } from 'zod';

import type { SavedRecipe } from '$lib/api/recipe/recipe.types';
import type {
  CalendarCellSchema,
  CalendarMonthDataSchema,
  CalendarMonthSchema,
  CalendarRecipeEntrySchema
} from './calendar.schemas';

export type CalendarMonth = z.infer<typeof CalendarMonthSchema>;
export type CalendarRecipeEntry = z.infer<typeof CalendarRecipeEntrySchema>;
export type CalendarMonthData = z.infer<typeof CalendarMonthDataSchema>;
export type CalendarCell = z.infer<typeof CalendarCellSchema>;

/** One calendar row: exactly seven cells. */
export type CalendarWeek = CalendarCell[];

/**
 * Whole-history index: ISO date (`YYYY-MM-DD`) -> recipes made that day.
 *
 * Lists are **unsorted**; one shared {@link CalendarRecipeEntry} object per recipe is reused across
 * all of that recipe's dates. Treat as immutable once built (month selection caches against the
 * Map's identity).
 */
export type CheckoutIndex = Map<string, CalendarRecipeEntry[]>;

/** The recipe fields the calendar reads. Lets callers pass full `SavedRecipe` rows or slim fixtures. */
export type CheckoutIndexSource = Pick<
  SavedRecipe,
  'id' | 'title' | 'checkout_history' | 'deleted_at' | 'is_current'
>;
