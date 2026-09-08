import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  checkoutHistoryNeedsNormalization,
  isoDateToday,
  normalizeCheckoutHistory,
  toIsoDate
} from './recipe.model';

const IsoDateSchema = z.iso.date();

describe('toIsoDate', () => {
  it('passes through canonical ISO calendar dates', () => {
    expect(toIsoDate('2026-01-05')).toBe('2026-01-05');
  });

  it('strips UTC timestamps to the authored calendar date', () => {
    expect(toIsoDate('2020-01-01T00:00:00.000Z')).toBe('2020-01-01');
  });

  it('strips offset timestamps to the authored calendar date', () => {
    expect(toIsoDate('2026-01-05T00:00:00+00:00')).toBe('2026-01-05');
  });

  it('accepts space-separated datetimes by taking the date prefix', () => {
    expect(toIsoDate('2024-06-15 18:30:00')).toBe('2024-06-15');
  });

  it('returns null for empty or unparseable values', () => {
    expect(toIsoDate('')).toBeNull();
    expect(toIsoDate('   ')).toBeNull();
    expect(toIsoDate('not-a-date')).toBeNull();
  });
});

describe('isoDateToday', () => {
  it('returns an ISO-8601 date with no timestamp', () => {
    const value = isoDateToday();
    expect(IsoDateSchema.safeParse(value).success).toBe(true);
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(value).not.toContain('T');
  });
});

describe('normalizeCheckoutHistory', () => {
  it('returns null for nullish history', () => {
    expect(normalizeCheckoutHistory(null)).toBeNull();
    expect(normalizeCheckoutHistory(undefined)).toBeNull();
  });

  it('converts mixed timestamps to ISO dates and drops invalid entries', () => {
    expect(
      normalizeCheckoutHistory([
        '2026-01-05',
        '2020-01-01T00:00:00.000Z',
        'not-a-date',
        '2024-06-15T12:00:00+00:00'
      ])
    ).toEqual(['2026-01-05', '2020-01-01', '2024-06-15']);
  });
});

describe('checkoutHistoryNeedsNormalization', () => {
  it('is false for null, empty, and already-canonical lists', () => {
    expect(checkoutHistoryNeedsNormalization(null)).toBe(false);
    expect(checkoutHistoryNeedsNormalization([])).toBe(false);
    expect(
      checkoutHistoryNeedsNormalization(['2026-01-05', '2026-02-01'])
    ).toBe(false);
  });

  it('is true when any entry is a timestamp or otherwise invalid', () => {
    expect(
      checkoutHistoryNeedsNormalization(['2026-01-05T00:00:00.000Z'])
    ).toBe(true);
    expect(checkoutHistoryNeedsNormalization(['2026-01-05', 'nope'])).toBe(
      true
    );
  });
});
