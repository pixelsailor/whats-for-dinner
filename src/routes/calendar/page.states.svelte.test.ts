// COMP, client project: loading and error presentation of the /calendar route.
// The store is replaced with a controllable one so these states are deterministic (a real Dexie
// live query resolves too quickly to observe "loading" reliably).
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import '../../app.css';
import PageHarness from './__tests__/PageHarness.svelte';

const MONTH = { year: 2026, month: 11 };

vi.mock('$app/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$app/navigation')>()),
  goto: vi.fn()
}));
vi.mock('$app/state', () => ({
  page: { url: new URL('http://localhost/calendar?month=2026-11') }
}));
vi.mock('$lib/stores/calendar', async () => {
  const { writable } = await import('svelte/store');
  const envelope = writable<unknown>({
    data: null,
    loading: true,
    error: null,
    month: { year: 2026, month: 11 }
  });
  return { calendarMonthStore: () => envelope, __envelope: envelope };
});

const { __envelope } = (await import('$lib/stores/calendar')) as unknown as {
  __envelope: { set: (value: unknown) => void };
};

describe('/calendar route states', () => {
  it('shows a spinner and the navigation, but no grid, while loading (AC-22)', async () => {
    __envelope.set({ data: null, loading: true, error: null, month: MONTH });
    const screen = render(PageHarness);

    await expect
      .element(screen.getByRole('heading', { level: 2, name: 'November 2026' }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByLabelText('Month', { exact: true }))
      .toBeInTheDocument();
    expect(document.querySelector('table')).toBeNull();
    expect(document.querySelector('.pxl--progress-spinner')).not.toBeNull();
    expect(screen.getByRole('status').elements()).toHaveLength(0);
  });

  it('shows the error name and message instead of a blank page or grid (AC-22)', async () => {
    const error = new Error('IndexedDB is unavailable');
    error.name = 'DatabaseClosedError';
    __envelope.set({ data: null, loading: false, error, month: MONTH });
    const screen = render(PageHarness);

    await expect
      .element(screen.getByText('DatabaseClosedError'))
      .toBeInTheDocument();
    await expect
      .element(screen.getByText('IndexedDB is unavailable'))
      .toBeInTheDocument();
    expect(document.querySelector('table')).toBeNull();
  });

  it('replaces the spinner with the grid once data arrives, without remounting the navigation (AC-35)', async () => {
    __envelope.set({ data: null, loading: true, error: null, month: MONTH });
    const screen = render(PageHarness);
    const select = screen.getByLabelText('Month', { exact: true }).element();

    __envelope.set({
      data: { days: new Map(), earliestYear: null },
      loading: false,
      error: null,
      month: MONTH
    });

    await expect
      .element(screen.getByRole('table', { name: 'November 2026' }))
      .toBeInTheDocument();
    expect(screen.getByLabelText('Month', { exact: true }).element()).toBe(
      select
    );
  });
});
