// Runs in the Vitest `client` (real Chromium + IndexedDB) project. Covers what the Node tests in
// `calendar.test.ts` cannot: Dexie's real `liveQuery` re-emitting after writes (AC-11, AC-35).
import { get, writable } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { CalendarMonth } from '$lib/api/calendar';
import { db } from '$lib/db';
import { calendarMonthStore } from './calendar';

/** Minimal full-shape recipe row. */
function row(id: string, title: string, checkout_history: string[]) {
  return {
    id,
    title,
    short_description: null,
    created_at: new Date().toISOString(),
    updated_at: null,
    archived: null,
    deleted_at: null,
    last_opened: null,
    version: 1,
    parent_id: null,
    is_current: true,
    is_favorite: null,
    owner_id: null,
    shared_id: null,
    synced: false,
    last_synced_at: null,
    sync_error: null,
    checkout_history
  };
}

const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_B = '22222222-2222-4222-8222-222222222222';

beforeEach(async () => {
  await db.recipes.clear();
  await db.recipes.bulkPut([
    row(ID_A, 'Tacos', ['2026-11-04']),
    row(ID_B, 'Soup', ['2026-11-04', '2026-12-01'])
  ] as never);
});

afterEach(async () => {
  await db.recipes.clear();
});

describe('calendarMonthStore with real Dexie', () => {
  it('loads, navigates months without re-reading, and updates live', async () => {
    const month = writable<CalendarMonth>({ year: 2026, month: 11 });
    const store = calendarMonthStore(month);
    const loadingFlags: boolean[] = [];
    const unsubscribe = store.subscribe((v) => loadingFlags.push(v.loading));

    await expect.poll(() => get(store).loading, { timeout: 10000 }).toBe(false);
    expect(get(store).error).toBeNull();
    expect(
      get(store)
        .data?.days.get('2026-11-04')
        ?.map((e) => e.title)
    ).toEqual(['Soup', 'Tacos']);

    // Month navigation is a pure in-memory slice: no loading state reappears.
    const afterLoad = loadingFlags.length;
    month.set({ year: 2026, month: 12 });
    month.set({ year: 2027, month: 3 });
    month.set({ year: 2026, month: 11 });
    expect(loadingFlags.slice(afterLoad).every((loading) => !loading)).toBe(
      true
    );

    // Live add.
    month.set({ year: 2031, month: 1 });
    expect(get(store).data?.days.size).toBe(0);
    await db.recipes.put(
      row(crypto.randomUUID(), 'Live add', ['2031-01-15']) as never
    );
    await expect
      .poll(() => get(store).data?.days.get('2031-01-15')?.[0]?.title, {
        timeout: 5000
      })
      .toBe('Live add');

    // Title edit and soft delete (and restore) propagate.
    await db.recipes.update(ID_A, { title: 'Carnitas' });
    month.set({ year: 2026, month: 11 });
    await expect
      .poll(
        () =>
          get(store)
            .data?.days.get('2026-11-04')
            ?.map((e) => e.title),
        {
          timeout: 5000
        }
      )
      .toEqual(['Carnitas', 'Soup']);

    await db.recipes.update(ID_B, { deleted_at: new Date().toISOString() });
    await expect
      .poll(
        () =>
          get(store)
            .data?.days.get('2026-11-04')
            ?.map((e) => e.title),
        {
          timeout: 5000
        }
      )
      .toEqual(['Carnitas']);

    await db.recipes.update(ID_B, { deleted_at: null });
    await expect
      .poll(() => get(store).data?.days.get('2026-11-04')?.length, {
        timeout: 5000
      })
      .toBe(2);

    unsubscribe();
  }, 30000);
});
