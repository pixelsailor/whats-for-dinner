import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';

import {
  type CalendarMonth,
  type CheckoutIndexSource,
  buildCheckoutIndex,
  buildMonthGrid,
  formatCalendarMonthLabel,
  getWeekdayLabels,
  selectCalendarMonth
} from '$lib/api/calendar';
import '../../../app.css';
import MonthGrid from './MonthGrid.svelte';

const NOV_2026: CalendarMonth = { year: 2026, month: 11 };

const ID_TACOS = '11111111-1111-4111-8111-111111111111';
const ID_SOUP = '22222222-2222-4222-8222-222222222222';
const ID_LONG = '33333333-3333-4333-8333-333333333333';

const LONG_TITLE =
  'Slow-roasted heirloom tomato and white bean stew with garlic confit, fresh basil, and charred sourdough';

function source(
  id: string,
  title: string,
  history: string[]
): CheckoutIndexSource {
  return {
    id,
    title,
    checkout_history: history,
    deleted_at: null,
    is_current: true
  };
}

/** Builds the props MonthGrid needs for a month and a set of recipes. */
function propsFor(
  recipes: CheckoutIndexSource[],
  month: CalendarMonth = NOV_2026,
  todayIso = '2026-11-04'
) {
  const data = selectCalendarMonth(buildCheckoutIndex(recipes), month);
  return {
    weeks: buildMonthGrid(month, data, { todayIso }),
    monthLabel: formatCalendarMonthLabel(month),
    weekdays: getWeekdayLabels()
  };
}

const recipes = [
  source(ID_TACOS, 'Tacos', ['2026-11-04', '2026-11-20']),
  source(ID_SOUP, 'Soup', ['2026-11-04']),
  source(ID_LONG, LONG_TITLE, ['2026-11-04'])
];

describe('MonthGrid', () => {
  it('renders a table named for the month with seven weekday column headers (AC-12, AC-32)', async () => {
    const screen = render(MonthGrid, propsFor(recipes));

    await expect
      .element(screen.getByRole('table', { name: 'November 2026' }))
      .toBeInTheDocument();

    const headers = screen.getByRole('columnheader');
    await expect.element(headers.first()).toHaveTextContent('Sunday');
    expect(headers.elements()).toHaveLength(7);
    for (const name of [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
    ]) {
      await expect
        .element(screen.getByRole('columnheader', { name }))
        .toBeInTheDocument();
    }
  });

  it('numbers every day of the month in <time datetime> elements (AC-12, AC-32)', async () => {
    const { container } = render(MonthGrid, propsFor(recipes));
    const times = [...container.querySelectorAll('time')];

    expect(times).toHaveLength(30);
    expect(times.map((t) => t.textContent)).toEqual(
      Array.from({ length: 30 }, (_, i) => String(i + 1))
    );
    expect(times[0].getAttribute('datetime')).toBe('2026-11-01');
    expect(times[29].getAttribute('datetime')).toBe('2026-11-30');
  });

  it("marks only today's number with aria-current=date (AC-13)", async () => {
    const { container } = render(MonthGrid, propsFor(recipes));
    const current = container.querySelectorAll('[aria-current="date"]');

    expect(current).toHaveLength(1);
    expect(current[0].textContent).toBe('4');
  });

  it('marks no day as current when the month does not contain today', async () => {
    const { container } = render(
      MonthGrid,
      propsFor(recipes, NOV_2026, '2027-01-15')
    );
    expect(container.querySelectorAll('[aria-current]')).toHaveLength(0);
  });

  it('lists every recipe made on a day as links to the recipe page (AC-15, AC-17)', async () => {
    const screen = render(MonthGrid, propsFor(recipes));

    const tacos = screen.getByRole('link', { name: 'Tacos' });
    expect(tacos.elements()).toHaveLength(2); // Nov 4 and Nov 20
    await expect
      .element(tacos.first())
      .toHaveAttribute('href', `/recipes/${ID_TACOS}`);
    await expect
      .element(screen.getByRole('link', { name: 'Soup' }))
      .toHaveAttribute('href', `/recipes/${ID_SOUP}`);

    // All three recipes are present on Nov 4 (no hidden "+N more").
    const cell = screen
      .getByRole('link', { name: 'Soup' })
      .element()
      .closest('td')!;
    expect(cell.querySelectorAll('a')).toHaveLength(3);
  });

  it('orders recipes within a day by title (AC-08)', async () => {
    const { container } = render(MonthGrid, propsFor(recipes));
    const cell = container.querySelector(
      'time[datetime="2026-11-04"]'
    )!.parentElement!;
    expect([...cell.querySelectorAll('a')].map((a) => a.textContent)).toEqual([
      'Slow-roasted heirloom tomato and white bean stew with garlic confit, fresh basil, and charred sourdough',
      'Soup',
      'Tacos'
    ]);
  });

  it('exposes the full untruncated title on long recipe pills (AC-14, AC-15)', async () => {
    const screen = render(MonthGrid, propsFor(recipes));
    const link = screen.getByRole('link', { name: LONG_TITLE });
    await expect.element(link).toHaveAttribute('title', LONG_TITLE);

    const style = getComputedStyle(link.element());
    expect(style.textOverflow).toBe('ellipsis');
    expect(style.whiteSpace).toBe('nowrap');
    expect(style.overflow).toBe('hidden');
  });

  it('renders blank filler cells without numbers or content (AC-04)', async () => {
    const { container } = render(MonthGrid, propsFor(recipes));
    const cells = [...container.querySelectorAll('tbody td')];

    // Nov 2026: starts on Sunday, 30 days -> 5 rows x 7 = 35 cells, 5 trailing fillers.
    expect(cells).toHaveLength(35);
    const fillers = cells.filter((td) => td.querySelector('time') === null);
    expect(fillers).toHaveLength(5);
    expect(fillers.every((td) => td.textContent?.trim() === '')).toBe(true);
  });
});

describe('MonthGrid touch targets (AC-32)', () => {
  // WCAG 2.2 AA 2.5.8 (Target Size, Minimum): interactive targets are at least 24x24 CSS px.
  // Axe flagged 20px-tall pills; this guards the fix (`py-1` on a 16px line height).
  it.each([320, 768, 1280])(
    'every recipe pill is at least 24px tall at a %ipx viewport',
    async (width) => {
      await page.viewport(width, 900);
      const { container } = render(MonthGrid, propsFor(recipes));

      const pills = [...container.querySelectorAll('tbody a')];
      expect(pills.length).toBeGreaterThan(0);
      for (const pill of pills) {
        const { height } = pill.getBoundingClientRect();
        expect(height, pill.getAttribute('title') ?? '').toBeGreaterThanOrEqual(
          24
        );
      }
    }
  );
});

describe('MonthGrid layout (AC-14, AC-16, AC-17)', () => {
  const manyRecipes = Array.from({ length: 12 }, (_, i) =>
    source(
      `aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, '0')}`,
      `Recipe ${i} ${LONG_TITLE}`,
      ['2026-11-18']
    )
  );

  it.each([320, 375, 768, 1280, 1920])(
    'fits a %ipx-wide viewport with seven equal columns, no horizontal scroll, one-line pills',
    async (width) => {
      await page.viewport(width, 900);
      const { container } = render(
        MonthGrid,
        propsFor([...recipes, ...manyRecipes])
      );

      const root = document.documentElement;
      expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);

      const table = container.querySelector('table')!;
      expect(table.getBoundingClientRect().width).toBeLessThanOrEqual(
        root.clientWidth
      );

      const widths = [...container.querySelectorAll('th')].map(
        (th) => th.getBoundingClientRect().width
      );
      expect(widths).toHaveLength(7);
      expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1.5);

      // Every pill stays on a single line (height of one text line, not a wrapped block).
      for (const a of container.querySelectorAll('a')) {
        const { height } = a.getBoundingClientRect();
        const lineHeight = parseFloat(getComputedStyle(a).lineHeight);
        const padding =
          parseFloat(getComputedStyle(a).paddingTop) +
          parseFloat(getComputedStyle(a).paddingBottom);
        expect(height).toBeLessThanOrEqual(lineHeight + padding + 1);
      }
    }
  );

  it('grows the busy day row without clipping any recipe and without widening columns', async () => {
    await page.viewport(768, 900);
    const { container } = render(
      MonthGrid,
      propsFor([...recipes, ...manyRecipes])
    );

    const busy = container.querySelector('time[datetime="2026-11-18"]')!
      .parentElement as HTMLTableCellElement;
    expect(busy.querySelectorAll('a')).toHaveLength(12);

    const row = busy.parentElement as HTMLTableRowElement;
    const otherRow = container.querySelector('time[datetime="2026-11-04"]')!
      .parentElement!.parentElement as HTMLTableRowElement;
    expect(row.getBoundingClientRect().height).toBeGreaterThan(
      otherRow.getBoundingClientRect().height
    );
    // The last pill is inside its cell (row grew to fit it).
    const last = [...busy.querySelectorAll('a')]
      .at(-1)!
      .getBoundingClientRect();
    expect(last.bottom).toBeLessThanOrEqual(
      busy.getBoundingClientRect().bottom + 1
    );
  });
});
