import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import '../../../app.css';
import AsidenavHarness from './__tests__/AsidenavHarness.svelte';

const nav = vi.hoisted(() => ({ pathname: '/calendar' }));

vi.mock('$app/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$app/navigation')>()),
  invalidate: vi.fn(),
  goto: vi.fn()
}));
vi.mock('$app/state', () => ({
  page: {
    get url() {
      return new URL(`http://localhost${nav.pathname}`);
    }
  }
}));

describe('Asidenav Calendar link (AC-31)', () => {
  it('links to /calendar with a visible label when expanded', async () => {
    nav.pathname = '/recipes';
    const screen = render(AsidenavHarness, { nav: 'expanded' });

    const link = screen.getByRole('link', { name: 'Calendar' });
    await expect.element(link).toHaveAttribute('href', '/calendar');
    await expect.element(link).toHaveTextContent('Calendar');
    await expect.element(link).not.toHaveAttribute('aria-current');
  });

  it('keeps an accessible name when collapsed and the text label is hidden', async () => {
    nav.pathname = '/recipes';
    const screen = render(AsidenavHarness, { nav: 'collapsed' });

    const link = screen.getByRole('link', { name: 'Calendar' });
    await expect.element(link).toHaveAttribute('href', '/calendar');
    await expect.element(link).toHaveAttribute('aria-label', 'Calendar');
    expect(link.element().textContent?.trim()).toBe('');
  });

  it('is keyboard focusable', async () => {
    nav.pathname = '/recipes';
    const screen = render(AsidenavHarness, { nav: 'expanded' });

    const link = screen.getByRole('link', { name: 'Calendar' });
    link.element().focus();
    await expect.element(link).toHaveFocus();
  });

  it('is marked as the current page on /calendar', async () => {
    nav.pathname = '/calendar';
    const screen = render(AsidenavHarness, { nav: 'expanded' });

    await expect
      .element(screen.getByRole('link', { name: 'Calendar' }))
      .toHaveAttribute('aria-current', 'page');
  });

  it('sits after Recommendations', async () => {
    nav.pathname = '/recipes';
    const { container } = render(AsidenavHarness, { nav: 'expanded' });

    const hrefs = [...container.querySelectorAll('a')].map((a) =>
      a.getAttribute('href')
    );
    expect(hrefs.indexOf('/calendar')).toBe(
      hrefs.indexOf('/recommendations') + 1
    );
  });
});
