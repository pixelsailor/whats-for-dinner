/**
 * Calendar Store
 *
 * Read model for the `/calendar` month view, derived from `checkout_history` on saved recipes.
 *
 * - `checkoutIndexStore` (internal): ONE `liveQuery` over `db.recipes`. The slim date index is
 *   built *inside* the query function, so recipe documents (ingredients, instructions, ...) are
 *   garbage-collected as soon as the index exists and are never retained by the store. This is why
 *   it does not derive from `unsortedRecipesStore` (which would keep every full recipe alive).
 * - `calendarMonthStore(month)` (public): a pure in-memory slice of that index. Changing the month
 *   never touches Dexie.
 *
 * The index is rebuilt once per change to `recipes`, only while something is subscribed (i.e. while
 * `/calendar` is mounted). A fresh `Map` is produced on every rebuild; indexes are never mutated.
 *
 * @see src/lib/api/calendar/README.md
 */

import { type Readable, derived } from 'svelte/store';

import {
  type CalendarMonth,
  type CalendarMonthData,
  type CheckoutIndex,
  buildCheckoutIndex,
  selectCalendarMonth
} from '$lib/api/calendar';
import { db } from '$lib/db';
import { createLiveQueryStore } from './_utils';

/** The `{ data, loading, error }` envelope shared by Dexie-backed stores. */
type StoreEnvelope<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};

/**
 * Envelope for {@link calendarMonthStore}. `month` is the month `data` was computed for, so views
 * can render heading and grid from one consistent value instead of racing a separate month source.
 */
export type CalendarMonthEnvelope = StoreEnvelope<CalendarMonthData> & {
  month: CalendarMonth;
};

/**
 * Whole-history date index. Internal: components must use {@link calendarMonthStore}.
 * @remarks Exported for tests and for the store module only.
 */
export const checkoutIndexStore: Readable<StoreEnvelope<CheckoutIndex>> =
  createLiveQueryStore(async () =>
    buildCheckoutIndex(await db.recipes.toArray())
  );

/**
 * Data for the month currently selected by `month`.
 *
 * Create this store **once** per view and drive it with a month store. Do not create a new store
 * per month: Svelte unsubscribes the previous `$store` before subscribing to its replacement, which
 * would stop and restart the underlying `liveQuery` (a Dexie re-read and a loading flash).
 *
 * @param month - Store holding the visible month (e.g. derived from the URL)
 * @returns Envelope whose `data` covers only that month's days plus the earliest checkout year
 * @example
 * ```ts
 * const month = derived(page, ($page) =>
 *   parseCalendarMonthParam($page.url.searchParams.get('month'), getCurrentCalendarMonth())
 * );
 * const calendar = calendarMonthStore(month);
 * // $calendar.data?.days ...
 * ```
 */
export function calendarMonthStore(
  month: Readable<CalendarMonth>
): Readable<CalendarMonthEnvelope> {
  return derived(
    [checkoutIndexStore, month],
    ([$index, $month]): CalendarMonthEnvelope => {
      if ($index.error) {
        return {
          data: null,
          loading: false,
          error: $index.error,
          month: $month
        };
      }
      if (!$index.data) {
        return { data: null, loading: true, error: null, month: $month };
      }
      return {
        data: selectCalendarMonth($index.data, $month),
        loading: false,
        error: null,
        month: $month
      };
    }
  );
}
