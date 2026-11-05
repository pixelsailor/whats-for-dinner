import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';

import { goto } from '$app/navigation';
import '../../../app.css';
import MonthNav from './MonthNav.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

const mockedGoto = vi.mocked(goto);

const props = {
  month: { year: 2026, month: 11 },
  years: [2024, 2025, 2026],
  currentMonth: { year: 2026, month: 11 }
};

beforeEach(() => {
  mockedGoto.mockReset();
  mockedGoto.mockResolvedValue(undefined);
});

describe('MonthNav', () => {
  it('offers previous, next, and Today as real links (AC-18)', async () => {
    const screen = render(MonthNav, {
      ...props,
      month: { year: 2026, month: 1 },
      currentMonth: { year: 2026, month: 11 }
    });

    await expect
      .element(screen.getByRole('link', { name: 'Previous month' }))
      .toHaveAttribute('href', '/calendar?month=2025-12');
    await expect
      .element(screen.getByRole('link', { name: 'Next month' }))
      .toHaveAttribute('href', '/calendar?month=2026-02');
    await expect
      .element(screen.getByRole('link', { name: 'Today' }))
      .toHaveAttribute('href', '/calendar?month=2026-11');
  });

  it('has labelled month and year selectors reflecting the viewed month (AC-19)', async () => {
    const screen = render(MonthNav, props);

    const month = screen.getByLabelText('Month', { exact: true });
    const year = screen.getByLabelText('Year', { exact: true });
    await expect.element(month).toHaveValue('11');
    await expect.element(year).toHaveValue('2026');

    expect(month.element().querySelectorAll('option')).toHaveLength(12);
    expect(
      [...year.element().querySelectorAll('option')].map((o) => o.textContent)
    ).toEqual(['2024', '2025', '2026']);
  });

  it('includes a viewed year that has no data in the year list (AC-19)', async () => {
    const screen = render(MonthNav, {
      ...props,
      month: { year: 2030, month: 3 },
      years: [2024, 2025, 2026, 2030]
    });
    await expect
      .element(screen.getByLabelText('Year', { exact: true }))
      .toHaveValue('2030');
  });

  it('navigates when a month is chosen, keeping the year (AC-19)', async () => {
    const screen = render(MonthNav, props);

    await screen
      .getByLabelText('Month', { exact: true })
      .selectOptions('March');

    expect(mockedGoto).toHaveBeenCalledTimes(1);
    expect(mockedGoto.mock.calls[0][0]).toBe('/calendar?month=2026-03');
  });

  it('navigates when a year is chosen, keeping the month (AC-19)', async () => {
    const screen = render(MonthNav, props);

    await screen.getByLabelText('Year', { exact: true }).selectOptions('2024');

    expect(mockedGoto).toHaveBeenCalledTimes(1);
    expect(mockedGoto.mock.calls[0][0]).toBe('/calendar?month=2024-11');
  });

  it('is keyboard operable: links and selects are tabbable in order (AC-32)', async () => {
    const screen = render(MonthNav, props);

    screen.getByRole('link', { name: 'Previous month' }).element().focus();
    await expect
      .element(screen.getByRole('link', { name: 'Previous month' }))
      .toHaveFocus();
    await userEvent.tab();
    await expect
      .element(screen.getByRole('link', { name: 'Next month' }))
      .toHaveFocus();
    await userEvent.tab();
    await expect
      .element(screen.getByLabelText('Month', { exact: true }))
      .toHaveFocus();
    await userEvent.tab();
    await expect
      .element(screen.getByLabelText('Year', { exact: true }))
      .toHaveFocus();
    await userEvent.tab();
    await expect
      .element(screen.getByRole('link', { name: 'Today' }))
      .toHaveFocus();
  });
});
