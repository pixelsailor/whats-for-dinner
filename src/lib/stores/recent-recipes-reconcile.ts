/**
 * @fileoverview Reconciles a stable Recent Recipes list against Dexie catalog snapshots.
 * @module lib/stores/recent-recipes-reconcile
 */

import type { SavedRecipe } from '$lib/api/recipe';

/** Maximum number of recipes shown in Recent Recipes. */
export const RECENT_RECIPES_MAX = 15;

/** Minimal row exposed to the sidenav; full SavedRecipe fields are not required. */
export type RecentRecipeListItem = {
  id: string;
  title: string;
  last_opened: string;
};

/** Per-id last seen last_opened for membership-add decisions. */
export type LastOpenedSeenMap = Map<string, string>;

/**
 * Maps a saved recipe to the minimal recent-list row shape.
 * @param recipe - Catalog recipe with last_opened set
 * @returns Sidenav-compatible recent row
 */
function toListItem(recipe: SavedRecipe): RecentRecipeListItem {
  return {
    id: recipe.id,
    title: recipe.title,
    last_opened: recipe.last_opened!
  };
}

/**
 * Returns true when current last_opened is strictly newer than the previously seen value.
 * @param current - Latest last_opened from the catalog
 * @param previous - Last observed last_opened for the id, if any
 */
function isNewerLastOpened(
  current: string,
  previous: string | undefined
): boolean {
  if (previous === undefined) {
    return true;
  }
  return new Date(current).getTime() > new Date(previous).getTime();
}

/**
 * Reconcile stable Recent Recipes list against a catalog snapshot.
 * @param stableList - Current stable list (empty on first run)
 * @param catalog - Active recipes from Dexie (non-deleted)
 * @param lastSeenLastOpenedById - Map updated across calls; tracks last observed last_opened per id
 * @param isFirstSnapshot - True only on first catalog emission after store init
 * @returns Next stable list and updated seen map; when only last_opened changed on existing members, list reference/order unchanged
 */
export function reconcileRecentRecipes(
  stableList: RecentRecipeListItem[],
  catalog: SavedRecipe[],
  lastSeenLastOpenedById: LastOpenedSeenMap,
  isFirstSnapshot: boolean
): {
  list: RecentRecipeListItem[];
  lastSeenLastOpenedById: LastOpenedSeenMap;
  changed: boolean;
} {
  const activeCatalog = catalog.filter((recipe) => recipe.deleted_at == null);
  const catalogById = new Map(
    activeCatalog.map((recipe) => [recipe.id, recipe])
  );

  const nextSeen = new Map(lastSeenLastOpenedById);
  for (const recipe of activeCatalog) {
    if (recipe.last_opened) {
      nextSeen.set(recipe.id, recipe.last_opened);
    }
  }

  if (isFirstSnapshot) {
    const withLastOpened = activeCatalog.filter((recipe) => recipe.last_opened);
    const sorted = [...withLastOpened].sort(
      (a, b) =>
        new Date(b.last_opened!).getTime() - new Date(a.last_opened!).getTime()
    );
    const seenIds = new Set<string>();
    const unique: SavedRecipe[] = [];
    for (const recipe of sorted) {
      if (!seenIds.has(recipe.id)) {
        seenIds.add(recipe.id);
        unique.push(recipe);
      }
    }

    const list = unique.slice(0, RECENT_RECIPES_MAX).map(toListItem);
    return { list, lastSeenLastOpenedById: nextSeen, changed: true };
  }

  let changed = false;
  const listIds = new Set(stableList.map((item) => item.id));

  const kept: RecentRecipeListItem[] = [];
  for (const item of stableList) {
    const recipe = catalogById.get(item.id);
    if (!recipe || !recipe.last_opened) {
      changed = true;
      listIds.delete(item.id);
      continue;
    }

    if (recipe.title !== item.title) {
      changed = true;
      kept.push({
        id: item.id,
        title: recipe.title,
        last_opened: recipe.last_opened
      });
    } else {
      kept.push(item);
    }
  }

  const toPrepend: RecentRecipeListItem[] = [];
  for (const recipe of activeCatalog) {
    if (!recipe.last_opened || listIds.has(recipe.id)) {
      continue;
    }

    const previousSeen = lastSeenLastOpenedById.get(recipe.id);
    if (!isNewerLastOpened(recipe.last_opened, previousSeen)) {
      continue;
    }

    changed = true;
    toPrepend.push(toListItem(recipe));
    listIds.add(recipe.id);
  }

  toPrepend.sort(
    (a, b) =>
      new Date(b.last_opened).getTime() - new Date(a.last_opened).getTime()
  );

  if (!changed) {
    return {
      list: stableList,
      lastSeenLastOpenedById: nextSeen,
      changed: false
    };
  }

  const list = [...toPrepend, ...kept].slice(0, RECENT_RECIPES_MAX);
  return { list, lastSeenLastOpenedById: nextSeen, changed: true };
}
