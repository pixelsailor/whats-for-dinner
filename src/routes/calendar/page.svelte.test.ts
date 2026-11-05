// COMP, client project: the real /calendar route against real Chromium + IndexedDB.
// Only `$app/state` (current URL) and `$app/navigation` are stubbed.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import '../../app.css';
import {
  formatCalendarMonthLabel,
  getCurrentCalendarMonth
} from '$lib/api/calendar';
import { db } from '$lib/db';
import PageHarness from './__tests__/PageHarness.svelte';

const url = vi.hoisted(() => ({ search: '?month=2026-11' }));

vi.mock('$app/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$app/navigation')>()),
  goto: vi.fn()
}));
vi.mock('$app/state', () => ({
  page: {
    get url() {
      return new URL(`http://localhost/calendar${url.search}`);
    }
  }
}));

const ID_TACOS = '11111111-1111-4111-8111-111111111111';
const ID_SOUP = '22222222-2222-4222-8222-222222222222';
const ID_OLD = '33333333-3333-4333-8333-333333333333';
const ID_TRASH = '44444444-4444-4444-8444-444444444444';

/** Minimal full-shape recipe row. */
function row(
  id: string,
  title: string,
  checkout_history: string[],
  deleted_at: string | null = null
) {
  return {
    id,
    title,
    short_description: null,
    created_at: new Date().toISOString(),
    updated_at: null,
    archived: null,
    deleted_at,
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

async function seed(rows: ReturnType<typeof row>[]) {
  await db.recipes.clear();
  if (rows.length) await db.recipes.bulkPut(rows as never);
}

beforeEach(async () => {
  url.search = '?month=2026-11';
  await seed([
    row(ID_TACOS, 'Tacos', ['2026-11-04', '2026-11-20']),
    row(ID_SOUP, 'Soup', ['2026-11-04']),
    row(ID_OLD, 'Old favourite', ['2024-02-10']),
    row(ID_TRASH, 'Deleted dinner', ['2026-11-10'], '2026-11-11T00:00:00.000Z')
  ]);
});

afterEach(async () => {
  await db.recipes.clear();
});

describe('/calendar route', () => {
  it('shows the URL month as one h1 and one month h2 (AC-12, AC-32)', async () => {
    const screen = render(PageHarness);

    await expect
      .element(screen.getByRole('heading', { level: 2, name: 'November 2026' }))
      .toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 }).elements()).toHaveLength(
      1
    );
    await expect
      .element(screen.getByRole('heading', { level: 1 }))
      .toHaveTextContent('Calendar');
    expect(screen.getByRole('heading', { level: 2 }).elements()).toHaveLength(
      1
    );
    await expect
      .element(screen.getByRole('table', { name: 'November 2026' }))
      .toBeInTheDocument();
  });

  it('lists recipes made on each day as links to their pages (AC-12, AC-15)', async () => {
    const screen = render(PageHarness);

    const tacos = screen.getByRole('link', { name: 'Tacos' });
    await expect.poll(() => tacos.elements().length).toBe(2); // Nov 4 and Nov 20
    await expect
      .element(tacos.first())
      .toHaveAttribute('href', `/recipes/${ID_TACOS}`);
    await expect
      .element(screen.getByRole('link', { name: 'Soup' }))
      .toHaveAttribute('href', `/recipes/${ID_SOUP}`);
  });

  it('hides recipes that are in the trash (AC-10)', async () => {
    const screen = render(PageHarness);

    await expect
      .element(screen.getByRole('link', { name: 'Soup' }))
      .toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Deleted dinner' }).elements()
    ).toHaveLength(0);
  });

  it('shows the grid plus a status line for a month with no recipes (AC-22)', async () => {
    url.search = '?month=2026-08';
    const screen = render(PageHarness);

    await expect
      .element(screen.getByRole('status'))
      .toHaveTextContent('No recipes were made in August 2026.');
    await expect
      .element(screen.getByRole('table', { name: 'August 2026' }))
      .toBeInTheDocument();
    // Month 31 days, starts Saturday -> 6 rows; every day still numbered.
    expect(document.querySelectorAll('tbody time').length).toBe(31);
  });

  it('shows the grid plus helper text when nothing was ever made (AC-22)', async () => {
    await seed([row(ID_SOUP, 'Never cooked', [])]);
    const screen = render(PageHarness);

    await expect
      .element(screen.getByRole('status'))
      .toHaveTextContent('Nothing has been marked as made yet');
    await expect
      .element(screen.getByRole('link', { name: 'Browse My Recipes' }))
      .toHaveAttribute('href', '/recipes');
    await expect
      .element(screen.getByRole('table', { name: 'November 2026' }))
      .toBeInTheDocument();
  });

  it.each(['?month=garbage', '?month=2026-13', '?month=2026-1', ''])(
    'falls back to the current month for %j without redirecting (AC-02)',
    async (search) => {
      url.search = search;
      const screen = render(PageHarness);

      const label = formatCalendarMonthLabel(getCurrentCalendarMonth());
      await expect
        .element(screen.getByRole('heading', { level: 2 }))
        .toHaveTextContent(label);
    }
  );

  it('builds previous / next links from the URL month (AC-18)', async () => {
    url.search = '?month=2026-12';
    const screen = render(PageHarness);

    await expect
      .element(screen.getByRole('link', { name: 'Previous month' }))
      .toHaveAttribute('href', '/calendar?month=2026-11');
    await expect
      .element(screen.getByRole('link', { name: 'Next month' }))
      .toHaveAttribute('href', '/calendar?month=2027-01');
  });

  it('offers years from the earliest checkout to now, plus the viewed year (AC-19)', async () => {
    url.search = '?month=2031-01';
    const screen = render(PageHarness);

    const year = screen.getByLabelText('Year', { exact: true });
    await expect.element(year).toHaveValue('2031');

    const currentYear = getCurrentCalendarMonth().year;
    const expected = [
      ...Array.from({ length: currentYear - 2024 + 1 }, (_, i) => 2024 + i),
      2031
    ].map(String);
    await expect
      .poll(() =>
        [...year.element().querySelectorAll('option')].map((o) => o.value)
      )
      .toEqual(expected);
  });

  it('gives every link and selector an accessible name (AC-32)', async () => {
    const screen = render(PageHarness);
    await expect
      .element(screen.getByRole('link', { name: 'Soup' }))
      .toBeInTheDocument();

    for (const link of document.querySelectorAll('a')) {
      const name =
        link.getAttribute('aria-label') ?? link.textContent?.trim() ?? '';
      expect(name, link.outerHTML).not.toBe('');
    }
    for (const select of document.querySelectorAll('select')) {
      expect(
        document
          .querySelector(`label[for="${select.id}"]`)
          ?.textContent?.trim(),
        select.outerHTML
      ).toBeTruthy();
    }
  });

  it('keeps pills and day numbers in document order for Tab navigation (AC-32)', async () => {
    const screen = render(PageHarness);
    await expect
      .element(screen.getByRole('link', { name: 'Soup' }))
      .toBeInTheDocument();

    const tabbable = [...document.querySelectorAll('a, select')].filter(
      (el) => !el.closest('[aria-hidden="true"]')
    );
    const labels = tabbable.map(
      (el) => el.getAttribute('aria-label') ?? el.textContent?.trim()
    );
    // Navigation controls come before grid content; Nov 4's pills precede Nov 20's.
    expect(labels.indexOf('Previous month')).toBeLessThan(
      labels.indexOf('Soup')
    );
    expect(labels.indexOf('Soup')).toBeLessThan(labels.lastIndexOf('Tacos'));
  });
});
