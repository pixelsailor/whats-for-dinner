import { describe, expect, it } from 'vitest';

import {
  formatCalendarMonthLabel,
  getMonthNames,
  getWeekdayLabels
} from './calendar.labels';

describe('formatCalendarMonthLabel', () => {
  it('formats month and year', () => {
    expect(formatCalendarMonthLabel({ year: 2026, month: 11 })).toBe(
      'November 2026'
    );
    expect(formatCalendarMonthLabel({ year: 2024, month: 2 })).toBe(
      'February 2024'
    );
  });

  it('does not shift at month boundaries in any time zone', () => {
    expect(formatCalendarMonthLabel({ year: 2026, month: 1 })).toBe(
      'January 2026'
    );
    expect(formatCalendarMonthLabel({ year: 2026, month: 12 })).toBe(
      'December 2026'
    );
  });
});

describe('getMonthNames', () => {
  it('returns twelve names starting with January', () => {
    const names = getMonthNames();
    expect(names).toHaveLength(12);
    expect(names[0]).toBe('January');
    expect(names[10]).toBe('November');
    expect(names[11]).toBe('December');
  });
});

describe('getWeekdayLabels', () => {
  it('is Sunday-first by default with long, short and narrow names', () => {
    const labels = getWeekdayLabels();
    expect(labels).toHaveLength(7);
    expect(labels[0]).toEqual({ long: 'Sunday', short: 'Sun', narrow: 'S' });
    expect(labels[3]).toEqual({ long: 'Wednesday', short: 'Wed', narrow: 'W' });
    expect(labels[6].long).toBe('Saturday');
  });

  it('rotates to Monday-first', () => {
    const labels = getWeekdayLabels(1);
    expect(labels[0].long).toBe('Monday');
    expect(labels[6].long).toBe('Sunday');
  });
});
