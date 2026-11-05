import { get, writable } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CalendarMonth } from '$lib/api/calendar';

const toArray = vi.fn();

// Dexie's liveQuery does not emit without IndexedDB. Stub it with a one-shot observable so these
// tests cover the store's own logic; real Dexie behaviour is checked in a browser (see build-log).
vi.mock('dexie', () => ({
  liveQuery: (query: () => Promise<unknown>) => ({
    subscribe: (observer: {
      next: (value: unknown) => void;
      error: (error: unknown) => void;
    }) => {
      query().then(observer.next, observer.error);
      return { unsubscribe() {} };
    }
  })
}));

vi.mock('$lib/db', () => ({
  db: { recipes: { toArray: (...args: unknown[]) => toArray(...args) } }
}));

/** Fresh module per test: svelte `readable` keeps its last value after the final unsubscribe. */
async function loadStores() {
  vi.resetModules();
  return import('./calendar');
}

/** Subscribes and resolves with the first envelope matching `predicate`. */
function waitFor<T>(
  store: { subscribe: (run: (v: T) => void) => () => void },
  predicate: (value: T) => boolean
): Promise<T> {
  return new Promise((resolve) => {
    const unsubscribe = store.subscribe((value) => {
      if (predicate(value)) {
        queueMicrotask(() => unsubscribe());
        resolve(value);
      }
    });
  });
}

const recipes = [
  {
    id: 'a',
    title: 'Tacos',
    checkout_history: ['2026-11-04', '2026-12-01'],
    deleted_at: null,
    is_current: true
  },
  {
    id: 'b',
    title: 'Soup',
    checkout_history: ['2026-11-04', '2025-02-02'],
    deleted_at: null,
    is_current: true
  }
];

beforeEach(() => {
  toArray.mockReset();
  toArray.mockResolvedValue(recipes);
});

describe('checkoutIndexStore', () => {
  it('starts loading and then emits a date index (AC-11)', async () => {
    const { checkoutIndexStore } = await loadStores();
    const seen: boolean[] = [];
    const result = await waitFor(checkoutIndexStore, (v) => {
      seen.push(v.loading);
      return !v.loading;
    });

    expect(seen[0]).toBe(true);
    expect(result.error).toBeNull();
    expect(result.data?.get('2026-11-04')?.map((e) => e.id)).toEqual([
      'a',
      'b'
    ]);
  });

  it('retains only slim entries, never recipe documents (AC-26)', async () => {
    const { checkoutIndexStore } = await loadStores();
    const result = await waitFor(checkoutIndexStore, (v) => !v.loading);
    for (const entries of result.data!.values()) {
      for (const entry of entries) {
        expect(Object.keys(entry).sort()).toEqual(['id', 'title']);
      }
    }
  });

  it('reports query failures through the envelope', async () => {
    const { checkoutIndexStore } = await loadStores();
    toArray.mockRejectedValue(new Error('idb down'));
    const result = await waitFor(checkoutIndexStore, (v) => !v.loading);
    expect(result.data).toBeNull();
    expect(result.error?.message).toBe('idb down');
  });
});

describe('calendarMonthStore', () => {
  it('is loading until the index arrives, then slices the month', async () => {
    const { calendarMonthStore } = await loadStores();
    const month = writable<CalendarMonth>({ year: 2026, month: 11 });
    const store = calendarMonthStore(month);

    expect(get(store)).toMatchObject({
      loading: true,
      data: null,
      month: { year: 2026, month: 11 }
    });

    const ready = await waitFor(store, (v) => !v.loading);
    expect([...ready.data!.days.keys()]).toEqual(['2026-11-04']);
    expect(ready.data!.days.get('2026-11-04')?.map((e) => e.title)).toEqual([
      'Soup',
      'Tacos'
    ]);
    expect(ready.data!.earliestYear).toBe(2025);
    expect(ready.month).toEqual({ year: 2026, month: 11 });
  });

  it('propagates errors', async () => {
    const { calendarMonthStore } = await loadStores();
    toArray.mockRejectedValue(new Error('boom'));
    const store = calendarMonthStore(writable({ year: 2026, month: 11 }));
    const result = await waitFor(store, (v) => !v.loading);
    expect(result.error?.message).toBe('boom');
    expect(result.data).toBeNull();
  });

  it('changes month with ZERO extra Dexie reads and no loading flash (AC-35)', async () => {
    const { calendarMonthStore } = await loadStores();
    const month = writable<CalendarMonth>({ year: 2026, month: 11 });
    const store = calendarMonthStore(month);

    const emissions: Array<{ loading: boolean; days: string[] | null }> = [];
    const unsubscribe = store.subscribe((v) =>
      emissions.push({
        loading: v.loading,
        days: v.data ? [...v.data.days.keys()] : null
      })
    );
    await waitFor(store, (v) => !v.loading);
    expect(toArray).toHaveBeenCalledTimes(1);

    const afterLoad = emissions.length;
    for (let i = 0; i < 12; i++) {
      month.update((m) =>
        m.month === 12
          ? { year: m.year + 1, month: 1 }
          : { year: m.year, month: m.month + 1 }
      );
    }
    // Let any (unexpected) re-query settle.
    await new Promise((resolve) => setTimeout(resolve, 20));
    unsubscribe();

    expect(toArray).toHaveBeenCalledTimes(1);
    expect(emissions.slice(afterLoad).every((e) => !e.loading)).toBe(true);
    // Dec 2026 is month 12 steps... 1st step -> Dec 2026 contains the 2026-12-01 checkout.
    expect(
      emissions.slice(afterLoad).some((e) => e.days?.includes('2026-12-01'))
    ).toBe(true);
  });
});
