// COMP, client project: the real /recipes list against real Chromium + IndexedDB.
// Only `$app/state` (current URL) and `$app/navigation` are stubbed.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';

import '../../app.css';
import { db } from '$lib/db';
import PageHarness from './__tests__/PageHarness.svelte';

vi.mock('$app/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$app/navigation')>()),
  goto: vi.fn(),
  afterNavigate: vi.fn()
}));
vi.mock('$app/state', () => ({
  page: {
    get url() {
      return new URL('http://localhost/recipes');
    }
  }
}));

const ID_FAVORITE = '11111111-1111-4111-8111-111111111111';
const ID_NOT_FAVORITE = '22222222-2222-4222-8222-222222222222';
const ID_UNSET = '33333333-3333-4333-8333-333333333333';

/** Minimal full-shape recipe row. */
function row(id: string, title: string, is_favorite: boolean | null) {
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
    is_favorite,
    owner_id: null,
    shared_id: null,
    synced: false,
    last_synced_at: null,
    sync_error: null,
    tags: [],
    checkout_history: []
  };
}

async function seed(rows: ReturnType<typeof row>[]) {
  await db.recipes.clear();
  if (rows.length) await db.recipes.bulkPut(rows as never);
}

beforeEach(async () => {
  await seed([
    row(ID_FAVORITE, 'Lasagne', true),
    row(ID_NOT_FAVORITE, 'Omelette', false),
    row(ID_UNSET, 'Soup', null)
  ]);
});

afterEach(async () => {
  await db.recipes.clear();
});

describe('/recipes favorite indicator (issue #47)', () => {
  it('shows a favorite icon only for favorite recipes', async () => {
    const screen = render(PageHarness);

    await expect
      .element(screen.getByRole('link', { name: 'Lasagne' }))
      .toBeInTheDocument();
    await expect
      .element(screen.getByRole('img', { name: 'Favorite' }))
      .toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Favorite' }).elements()
    ).toHaveLength(1);
  });

  it('places the favorite icon inside the favorite recipe row, before its delete button', async () => {
    const screen = render(PageHarness);

    await expect
      .element(screen.getByRole('img', { name: 'Favorite' }))
      .toBeInTheDocument();

    const favoriteIcon = document.querySelector('[aria-label="Favorite"]');
    const row = favoriteIcon?.closest('a');
    expect(row?.textContent).toContain('Lasagne');

    const deleteButton = row?.querySelector('[aria-label="Delete recipe"]');
    expect(deleteButton).not.toBeNull();
    const position = favoriteIcon!.compareDocumentPosition(deleteButton!);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
