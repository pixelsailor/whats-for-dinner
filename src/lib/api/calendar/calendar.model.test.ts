import { describe, expect, it } from 'vitest';

import {
  MAX_YEAR_OPTIONS,
  buildCheckoutIndex,
  buildMonthGrid,
  formatCalendarMonthParam,
  getCalendarYearRange,
  getCurrentCalendarMonth,
  getDaysInCalendarMonth,
  parseCalendarMonthParam,
  selectCalendarMonth,
  shiftCalendarMonth
} from './calendar.model';
import type {
  CalendarCell,
  CalendarMonth,
  CheckoutIndexSource
} from './calendar.types';

const FALLBACK: CalendarMonth = { year: 2026, month: 11 };

/** Builds a minimal active recipe fixture. */
function recipe(
  id: string,
  title: string,
  history: string[] | null,
  overrides: Partial<CheckoutIndexSource> = {}
): CheckoutIndexSource {
  return {
    id,
    title,
    checkout_history: history,
    deleted_at: null,
    is_current: true,
    ...overrides
  };
}

type DayCell = Extract<CalendarCell, { kind: 'day' }>;

const dayCells = (weeks: CalendarCell[][]): DayCell[] =>
  weeks.flat().filter((cell): cell is DayCell => cell.kind === 'day');

describe('parseCalendarMonthParam / formatCalendarMonthParam (AC-01, AC-02)', () => {
  it('parses a valid YYYY-MM value and round-trips it', () => {
    const parsed = parseCalendarMonthParam('2026-11', FALLBACK);
    expect(parsed).toEqual({ year: 2026, month: 11 });
    expect(formatCalendarMonthParam(parsed)).toBe('2026-11');
  });

  it('zero-pads single-digit months and short years when formatting', () => {
    expect(formatCalendarMonthParam({ year: 2026, month: 1 })).toBe('2026-01');
    expect(formatCalendarMonthParam({ year: 987, month: 3 })).toBe('0987-03');
  });

  it.each([
    null,
    undefined,
    '',
    '2026-13',
    '2026-00',
    '26-1',
    '2026-1',
    '2026-11-04',
    ' 2026-11',
    'abc',
    ['2026-11'],
    { year: 2026 },
    42
  ])('returns the fallback for invalid input %j without throwing', (raw) => {
    expect(parseCalendarMonthParam(raw, FALLBACK)).toBe(FALLBACK);
  });
});

describe('shiftCalendarMonth (AC-03)', () => {
  it('moves by one month', () => {
    expect(shiftCalendarMonth({ year: 2026, month: 5 }, 1)).toEqual({
      year: 2026,
      month: 6
    });
    expect(shiftCalendarMonth({ year: 2026, month: 5 }, -1)).toEqual({
      year: 2026,
      month: 4
    });
  });

  it('crosses year boundaries in both directions', () => {
    expect(shiftCalendarMonth({ year: 2026, month: 12 }, 1)).toEqual({
      year: 2027,
      month: 1
    });
    expect(shiftCalendarMonth({ year: 2026, month: 1 }, -1)).toEqual({
      year: 2025,
      month: 12
    });
  });

  it('handles multi-month and multi-year deltas', () => {
    expect(shiftCalendarMonth({ year: 2026, month: 11 }, 14)).toEqual({
      year: 2028,
      month: 1
    });
    expect(shiftCalendarMonth({ year: 2026, month: 3 }, -15)).toEqual({
      year: 2024,
      month: 12
    });
    expect(shiftCalendarMonth({ year: 2026, month: 3 }, 0)).toEqual({
      year: 2026,
      month: 3
    });
  });
});

describe('getCurrentCalendarMonth', () => {
  it('derives the month from an ISO date', () => {
    expect(getCurrentCalendarMonth('2026-11-04')).toEqual({
      year: 2026,
      month: 11
    });
  });

  it('defaults to the local current month', () => {
    const current = getCurrentCalendarMonth();
    expect(current.year).toBeGreaterThan(2000);
    expect(current.month).toBeGreaterThanOrEqual(1);
    expect(current.month).toBeLessThanOrEqual(12);
  });
});

describe('getDaysInCalendarMonth', () => {
  it.each([
    [{ year: 2026, month: 1 }, 31],
    [{ year: 2026, month: 2 }, 28],
    [{ year: 2024, month: 2 }, 29],
    [{ year: 2100, month: 2 }, 28],
    [{ year: 2000, month: 2 }, 29],
    [{ year: 2026, month: 4 }, 30],
    [{ year: 2026, month: 12 }, 31]
  ])('%j has %i days', (month, expected) => {
    expect(getDaysInCalendarMonth(month)).toBe(expected);
  });
});

describe('buildCheckoutIndex (AC-07, AC-08, AC-09, AC-10, AC-36)', () => {
  it('places multiple recipes on one date and one recipe on multiple dates', () => {
    const index = buildCheckoutIndex([
      recipe('a', 'Tacos', ['2026-11-04', '2026-11-10']),
      recipe('b', 'Soup', ['2026-11-04'])
    ]);

    expect(index.get('2026-11-04')?.map((e) => e.id)).toEqual(['a', 'b']);
    expect(index.get('2026-11-10')?.map((e) => e.id)).toEqual(['a']);
    expect(index.size).toBe(2);
  });

  it('lists a recipe once when the same date is repeated', () => {
    const index = buildCheckoutIndex([
      recipe('a', 'Tacos', ['2026-11-04', '2026-11-04', '2026-11-04T08:00:00Z'])
    ]);
    expect(index.get('2026-11-04')).toHaveLength(1);
  });

  it('buckets legacy timestamp entries by their date part', () => {
    const index = buildCheckoutIndex([
      recipe('a', 'Tacos', [
        '2026-03-04T10:00:00.000Z',
        '2026-03-05 18:30:00',
        '2026-03-06T00:00:00+00:00'
      ])
    ]);
    expect([...index.keys()].sort()).toEqual([
      '2026-03-04',
      '2026-03-05',
      '2026-03-06'
    ]);
  });

  it('skips unparseable entries and tolerates null, empty, and missing history', () => {
    const index = buildCheckoutIndex([
      recipe('a', 'Tacos', ['nope', '', '   ', '2026-02-02']),
      recipe('b', 'Soup', null),
      recipe('c', 'Salad', []),
      recipe('d', 'Pie', undefined as unknown as string[])
    ]);
    expect([...index.keys()]).toEqual(['2026-02-02']);
    expect(index.get('2026-02-02')?.map((e) => e.id)).toEqual(['a']);
  });

  it('excludes soft-deleted and non-current recipes', () => {
    const history = ['2026-11-04'];
    const index = buildCheckoutIndex([
      recipe('keep', 'Keep', history),
      recipe('deleted', 'Deleted', history, {
        deleted_at: '2026-11-05T00:00:00.000Z'
      }),
      recipe('old', 'Old version', history, { is_current: false })
    ]);
    expect(index.get('2026-11-04')?.map((e) => e.id)).toEqual(['keep']);
  });

  it('includes a recipe again once deleted_at is cleared (restore)', () => {
    const deleted = recipe('a', 'Tacos', ['2026-11-04'], {
      deleted_at: '2026-11-05T00:00:00.000Z'
    });
    expect(buildCheckoutIndex([deleted]).size).toBe(0);
    expect(buildCheckoutIndex([{ ...deleted, deleted_at: null }]).size).toBe(1);
  });

  it('shares one entry object per recipe across all of its dates', () => {
    const index = buildCheckoutIndex([
      recipe('a', 'Tacos', ['2026-11-04', '2026-11-10', '2027-01-01'])
    ]);
    const first = index.get('2026-11-04')?.[0];
    expect(first).toEqual({ id: 'a', title: 'Tacos' });
    expect(index.get('2026-11-10')?.[0]).toBe(first);
    expect(index.get('2027-01-01')?.[0]).toBe(first);
  });
});

describe('selectCalendarMonth (AC-08, AC-36)', () => {
  const recipes = [
    recipe('3', 'banana bread', ['2026-11-04']),
    recipe('1', 'Apple pie', ['2026-11-04', '2026-12-01']),
    recipe('2', 'Apple pie', ['2026-11-04']),
    recipe('4', 'Zucchini', ['2026-10-31', '2025-06-15'])
  ];

  it('returns only the requested month and sorts by title then id', () => {
    const data = selectCalendarMonth(buildCheckoutIndex(recipes), {
      year: 2026,
      month: 11
    });

    expect([...data.days.keys()]).toEqual(['2026-11-04']);
    expect(data.days.get('2026-11-04')?.map((e) => e.id)).toEqual([
      '1',
      '2',
      '3'
    ]);
  });

  it('sorts independently of input recipe order and history order', () => {
    const forward = selectCalendarMonth(buildCheckoutIndex(recipes), {
      year: 2026,
      month: 11
    });
    const reversed = selectCalendarMonth(
      buildCheckoutIndex(
        [...recipes].reverse().map((r) => ({
          ...r,
          checkout_history: [...(r.checkout_history ?? [])].reverse()
        }))
      ),
      { year: 2026, month: 11 }
    );
    expect(reversed.days).toEqual(forward.days);
  });

  it('does not mutate the index lists it sorts', () => {
    const index = buildCheckoutIndex(recipes);
    const before = index.get('2026-11-04')?.map((e) => e.id);
    selectCalendarMonth(index, { year: 2026, month: 11 });
    expect(index.get('2026-11-04')?.map((e) => e.id)).toEqual(before);
  });

  it('reports the earliest year across the whole index', () => {
    const index = buildCheckoutIndex(recipes);
    expect(
      selectCalendarMonth(index, { year: 2026, month: 11 }).earliestYear
    ).toBe(2025);
    expect(
      selectCalendarMonth(index, { year: 2030, month: 1 }).earliestYear
    ).toBe(2025);
  });

  it('returns no days and a null earliestYear for an empty index', () => {
    const data = selectCalendarMonth(new Map(), { year: 2026, month: 11 });
    expect(data.days.size).toBe(0);
    expect(data.earliestYear).toBeNull();
  });

  it('returns an empty days map for a month with no checkouts', () => {
    const data = selectCalendarMonth(buildCheckoutIndex(recipes), {
      year: 2026,
      month: 8
    });
    expect(data.days.size).toBe(0);
    expect(data.earliestYear).toBe(2025);
  });

  it('includes the first and last day of the month but not neighbours', () => {
    const data = selectCalendarMonth(
      buildCheckoutIndex([
        recipe('a', 'A', [
          '2026-02-28',
          '2026-03-01',
          '2026-01-31',
          '2026-02-01'
        ])
      ]),
      { year: 2026, month: 2 }
    );
    expect([...data.days.keys()].sort()).toEqual(['2026-02-01', '2026-02-28']);
  });
});

describe('buildMonthGrid (AC-04, AC-05, AC-06)', () => {
  const empty = { days: new Map(), earliestYear: null };

  it('always returns weeks of exactly seven cells', () => {
    for (const [year, month] of [
      [2026, 2],
      [2024, 2],
      [2026, 8],
      [2026, 11],
      [2027, 5]
    ]) {
      const weeks = buildMonthGrid({ year, month }, empty, {
        todayIso: '2000-01-01'
      });
      for (const week of weeks) expect(week).toHaveLength(7);
    }
  });

  it('lays out a 28-day February starting on Sunday as exactly 4 weeks', () => {
    const weeks = buildMonthGrid({ year: 2026, month: 2 }, empty, {
      todayIso: '2000-01-01'
    });
    expect(weeks).toHaveLength(4);
    expect(weeks.flat().every((cell) => cell.kind === 'day')).toBe(true);
    expect(dayCells(weeks).map((c) => c.day)).toEqual(
      Array.from({ length: 28 }, (_, i) => i + 1)
    );
  });

  it('handles leap-year February (29 days, starts Thursday, 5 weeks)', () => {
    const weeks = buildMonthGrid({ year: 2024, month: 2 }, empty, {
      todayIso: '2000-01-01'
    });
    expect(weeks).toHaveLength(5);
    expect(weeks[0].slice(0, 4).every((c) => c.kind === 'filler')).toBe(true);
    expect(weeks[0][4]).toMatchObject({ kind: 'day', day: 1 });
    expect(dayCells(weeks)).toHaveLength(29);
  });

  it('needs 6 weeks for a 31-day month starting on Saturday', () => {
    const weeks = buildMonthGrid({ year: 2026, month: 8 }, empty, {
      todayIso: '2000-01-01'
    });
    expect(weeks).toHaveLength(6);
    expect(weeks[0].slice(0, 6).every((c) => c.kind === 'filler')).toBe(true);
    expect(weeks[0][6]).toMatchObject({ kind: 'day', day: 1 });
    expect(weeks[5][0]).toMatchObject({ kind: 'day', day: 30 });
    expect(weeks[5][1]).toMatchObject({ kind: 'day', day: 31 });
    expect(weeks[5].slice(2).every((c) => c.kind === 'filler')).toBe(true);
  });

  it('puts every day number on the right weekday (Nov 2026 starts on Sunday)', () => {
    const weeks = buildMonthGrid({ year: 2026, month: 11 }, empty, {
      todayIso: '2000-01-01'
    });
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0]).toMatchObject({ kind: 'day', day: 1 });
    // Nov 4, 2026 is a Wednesday (index 3 when Sunday-first)
    expect(weeks[0][3]).toMatchObject({ kind: 'day', day: 4 });
    expect(weeks[4][1]).toMatchObject({ kind: 'day', day: 30 });
  });

  it('defaults to Sunday-first and shifts to Monday-first with weekStart 1', () => {
    const sunday = buildMonthGrid({ year: 2026, month: 11 }, empty, {
      todayIso: '2000-01-01'
    });
    const monday = buildMonthGrid({ year: 2026, month: 11 }, empty, {
      todayIso: '2000-01-01',
      weekStart: 1
    });

    expect(sunday[0][0]).toMatchObject({ kind: 'day', day: 1 });
    // Nov 1, 2026 is a Sunday -> last column when Monday-first
    expect(monday[0].slice(0, 6).every((c) => c.kind === 'filler')).toBe(true);
    expect(monday[0][6]).toMatchObject({ kind: 'day', day: 1 });
    expect(dayCells(monday)).toHaveLength(30);
  });

  it('marks exactly one cell as today when the month contains it', () => {
    const weeks = buildMonthGrid({ year: 2026, month: 11 }, empty, {
      todayIso: '2026-11-04'
    });
    const today = dayCells(weeks).filter((c) => c.isToday);
    expect(today).toHaveLength(1);
    expect(today[0]).toMatchObject({ day: 4, iso: '2026-11-04' });
  });

  it('marks no cell as today when the month does not contain it', () => {
    const weeks = buildMonthGrid({ year: 2026, month: 10 }, empty, {
      todayIso: '2026-11-04'
    });
    expect(dayCells(weeks).some((c) => c.isToday)).toBe(false);
  });

  it('attaches the month data entries to the matching day', () => {
    const month = { year: 2026, month: 11 };
    const data = selectCalendarMonth(
      buildCheckoutIndex([
        recipe('a', 'Tacos', ['2026-11-04']),
        recipe('b', 'Soup', ['2026-11-04', '2026-11-30'])
      ]),
      month
    );
    const cells = dayCells(
      buildMonthGrid(month, data, { todayIso: '2000-01-01' })
    );

    expect(cells.find((c) => c.day === 4)?.entries.map((e) => e.title)).toEqual(
      ['Soup', 'Tacos']
    );
    expect(cells.find((c) => c.day === 30)?.entries).toHaveLength(1);
    expect(cells.find((c) => c.day === 5)?.entries).toEqual([]);
  });
});

describe('getCalendarYearRange', () => {
  it('spans earliest checkout year to the current year', () => {
    expect(
      getCalendarYearRange(2023, { year: 2025, month: 1 }, '2026-11-04')
    ).toEqual([2023, 2024, 2025, 2026]);
  });

  it('is just the current year when there are no checkouts', () => {
    expect(
      getCalendarYearRange(null, { year: 2026, month: 11 }, '2026-11-04')
    ).toEqual([2026]);
  });

  it('always includes the viewed year, even when outside the range', () => {
    expect(
      getCalendarYearRange(2025, { year: 2030, month: 1 }, '2026-11-04')
    ).toEqual([2025, 2026, 2030]);
    expect(
      getCalendarYearRange(2025, { year: 2010, month: 1 }, '2026-11-04')
    ).toEqual([2010, 2025, 2026]);
  });

  it('ignores an earliest year in the future', () => {
    expect(
      getCalendarYearRange(2040, { year: 2026, month: 1 }, '2026-11-04')
    ).toEqual([2026]);
  });

  it('caps the contiguous range so a bad historical date cannot flood the selector', () => {
    const years = getCalendarYearRange(
      1,
      { year: 2026, month: 1 },
      '2026-11-04'
    );
    expect(years).toHaveLength(MAX_YEAR_OPTIONS);
    expect(years.at(-1)).toBe(2026);
    expect(years[0]).toBe(2026 - (MAX_YEAR_OPTIONS - 1));
  });
});

describe('time-zone independence (AC-24)', () => {
  it('produces the same grid keys regardless of runtime TZ', () => {
    // Run under several TZ values via `TZ=<zone> pnpm exec vitest run ...`.
    const month = { year: 2026, month: 3 };
    const data = selectCalendarMonth(
      buildCheckoutIndex([
        recipe('a', 'Late night', ['2026-03-01', '2026-03-31']),
        recipe('b', 'Timestamped', ['2026-03-15T00:00:00.000Z'])
      ]),
      month
    );
    const cells = dayCells(
      buildMonthGrid(month, data, { todayIso: '2026-03-15' })
    );

    expect(cells.map((c) => c.iso)[0]).toBe('2026-03-01');
    expect(cells.at(-1)?.iso).toBe('2026-03-31');
    expect(cells.find((c) => c.day === 1)?.entries).toHaveLength(1);
    expect(cells.find((c) => c.day === 31)?.entries).toHaveLength(1);
    expect(cells.find((c) => c.day === 15)?.entries).toHaveLength(1);
    // Mar 1, 2026 is a Sunday regardless of the machine's offset.
    expect(
      buildMonthGrid(month, data, { todayIso: '2000-01-01' })[0][0]
    ).toMatchObject({
      kind: 'day',
      day: 1
    });
  });
});

describe('performance smoke (AC-36)', () => {
  it('indexes ~60,000 dates quickly enough to rule out quadratic behaviour', () => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const recipes: CheckoutIndexSource[] = Array.from(
      { length: 2000 },
      (_, i) =>
        recipe(
          `id-${i}`,
          `Recipe ${i}`,
          Array.from(
            { length: 30 },
            (_, j) =>
              `${2020 + ((i + j) % 6)}-${pad(1 + ((i * 7 + j) % 12))}-${pad(1 + ((i + j * 3) % 28))}`
          )
        )
    );

    const start = performance.now();
    const index = buildCheckoutIndex(recipes);
    const data = selectCalendarMonth(index, { year: 2023, month: 6 });
    const elapsed = performance.now() - start;

    expect(index.size).toBeGreaterThan(0);
    expect(data.earliestYear).toBe(2020);
    // Generous ceiling: only catches accidental O(n^2); real budgets are measured manually.
    expect(elapsed).toBeLessThan(500);
  });
});
