import { describe, expect, it } from 'vitest';

import type { SavedRecipe } from '$lib/api/recipe';

import {
  RECENT_RECIPES_MAX,
  reconcileRecentRecipes,
  type LastOpenedSeenMap,
  type RecentRecipeListItem
} from './recent-recipes-reconcile';

/**
 * Builds a minimal SavedRecipe for reconciler unit tests.
 * @param overrides - Fields to override on the fixture
 */
function recipe(
  overrides: Partial<SavedRecipe> & Pick<SavedRecipe, 'id' | 'title'>
): SavedRecipe {
  return {
    short_description: null,
    description: 'desc',
    ingredients: '- a',
    instructions: '1. b',
    tags: ['dinner'],
    yield: '2 servings',
    prep_time: ['10'],
    cook_time: ['20'],
    notes: null,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    archived: null,
    deleted_at: null,
    last_opened: null,
    version: 1,
    parent_id: null,
    is_current: true,
    is_favorite: false,
    owner_id: null,
    shared_id: null,
    synced: true,
    last_synced_at: null,
    sync_error: null,
    checkout_history: [],
    ...overrides
  };
}

describe('reconcileRecentRecipes', () => {
  it('AC-01: first snapshot sorts by last_opened descending and caps at 15', () => {
    const catalog = Array.from({ length: 18 }, (_, i) =>
      recipe({
        id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
        title: `Recipe ${i}`,
        last_opened: `2024-06-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`
      })
    );

    const result = reconcileRecentRecipes([], catalog, new Map(), true);

    expect(result.changed).toBe(true);
    expect(result.list).toHaveLength(RECENT_RECIPES_MAX);
    expect(result.list.map((item) => item.id)).toEqual(
      catalog
        .slice()
        .sort(
          (a, b) =>
            new Date(b.last_opened!).getTime() -
            new Date(a.last_opened!).getTime()
        )
        .slice(0, RECENT_RECIPES_MAX)
        .map((item) => item.id)
    );
    expect(result.list[0]?.title).toBe('Recipe 17');
    expect(result.list[14]?.title).toBe('Recipe 3');
  });

  it('AC-02: later last_opened change on existing id does not reorder and returns same list reference', () => {
    const a = recipe({
      id: '00000000-0000-4000-8000-000000000001',
      title: 'Alpha',
      last_opened: '2024-06-10T12:00:00.000Z'
    });
    const b = recipe({
      id: '00000000-0000-4000-8000-000000000002',
      title: 'Beta',
      last_opened: '2024-06-09T12:00:00.000Z'
    });

    const first = reconcileRecentRecipes([], [a, b], new Map(), true);
    expect(first.list.map((item) => item.id)).toEqual([a.id, b.id]);

    const catalogWithBumpedA = [
      { ...a, last_opened: '2024-06-20T12:00:00.000Z' },
      b
    ];
    const second = reconcileRecentRecipes(
      first.list,
      catalogWithBumpedA,
      first.lastSeenLastOpenedById,
      false
    );

    expect(second.changed).toBe(false);
    expect(second.list).toBe(first.list);
    expect(second.list.map((item) => item.id)).toEqual([a.id, b.id]);
  });

  it('AC-04: title change updates row in place without changing position', () => {
    const a = recipe({
      id: '00000000-0000-4000-8000-000000000001',
      title: 'Alpha',
      last_opened: '2024-06-10T12:00:00.000Z'
    });
    const b = recipe({
      id: '00000000-0000-4000-8000-000000000002',
      title: 'Beta',
      last_opened: '2024-06-09T12:00:00.000Z'
    });

    const first = reconcileRecentRecipes([], [a, b], new Map(), true);
    const renamed = [{ ...a, title: 'Alpha Renamed' }, b];
    const second = reconcileRecentRecipes(
      first.list,
      renamed,
      first.lastSeenLastOpenedById,
      false
    );

    expect(second.changed).toBe(true);
    expect(second.list.map((item) => item.id)).toEqual([a.id, b.id]);
    expect(second.list[0]?.title).toBe('Alpha Renamed');
    expect(second.list[1]?.title).toBe('Beta');
  });

  it('AC-05: deleted id is removed without backfill from older recipes', () => {
    const catalog = Array.from({ length: 16 }, (_, i) =>
      recipe({
        id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
        title: `Recipe ${i}`,
        last_opened: `2024-06-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`
      })
    );

    const first = reconcileRecentRecipes([], catalog, new Map(), true);
    expect(first.list).toHaveLength(15);

    const droppedTailId = catalog[0]!.id;
    expect(first.list.some((item) => item.id === droppedTailId)).toBe(false);

    const topId = first.list[0]!.id;
    const withoutTop = catalog.filter((item) => item.id !== topId);
    const second = reconcileRecentRecipes(
      first.list,
      withoutTop,
      first.lastSeenLastOpenedById,
      false
    );

    expect(second.changed).toBe(true);
    expect(second.list).toHaveLength(14);
    expect(second.list.some((item) => item.id === topId)).toBe(false);
    expect(second.list.some((item) => item.id === droppedTailId)).toBe(false);
  });

  it('AC-03: newly written last_opened on id not in list prepends and drops tail at 15', () => {
    const catalog = Array.from({ length: 15 }, (_, i) =>
      recipe({
        id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
        title: `Recipe ${i}`,
        last_opened: `2024-06-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`
      })
    );

    const first = reconcileRecentRecipes([], catalog, new Map(), true);
    expect(first.list).toHaveLength(15);
    const previousTailId = first.list[14]!.id;

    const newcomer = recipe({
      id: '00000000-0000-4000-8000-000000000099',
      title: 'Newcomer',
      last_opened: '2024-07-01T12:00:00.000Z'
    });
    const second = reconcileRecentRecipes(
      first.list,
      [...catalog, newcomer],
      first.lastSeenLastOpenedById,
      false
    );

    expect(second.changed).toBe(true);
    expect(second.list).toHaveLength(15);
    expect(second.list[0]?.id).toBe(newcomer.id);
    expect(second.list.some((item) => item.id === previousTailId)).toBe(false);
  });

  it('AC-06: older opened recipe never in list does not appear on unrelated catalog update', () => {
    const catalog = Array.from({ length: 16 }, (_, i) =>
      recipe({
        id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
        title: `Recipe ${i}`,
        last_opened: `2024-06-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`
      })
    );

    const first = reconcileRecentRecipes([], catalog, new Map(), true);
    const neverListedId = catalog[0]!.id;
    expect(first.list.some((item) => item.id === neverListedId)).toBe(false);

    const seen: LastOpenedSeenMap = first.lastSeenLastOpenedById;
    const renamedInList: RecentRecipeListItem[] = first.list;
    const catalogWithTitleChange = catalog.map((item) =>
      item.id === first.list[0]!.id
        ? { ...item, title: `${item.title} Updated` }
        : item
    );

    const second = reconcileRecentRecipes(
      renamedInList,
      catalogWithTitleChange,
      seen,
      false
    );

    expect(second.list.some((item) => item.id === neverListedId)).toBe(false);
    expect(second.list).toHaveLength(15);
  });
});
