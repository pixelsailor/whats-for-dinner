/**
 * Deterministic recommendation bucketing over {@link SavedRecipe} rows (ADR-009).
 * Reads only recipe-local fields and checkout history — not UserPreferences.
 */

import type { SavedRecipe } from '$lib/api/recipe';
import toMillis from '$lib/utils/toMilliseconds';

export interface RecommendationCategory {
  id: string;
  title: string;
  recipes: SavedRecipe[];
}

export interface CategorizeRecommendationsOptions {
  /** Meal tag from {@link getMealContext} (e.g. `dinner`); compared case-insensitively to recipe tags. */
  mealTag: string | null;
  /** When true, each bucket is filtered to recipes whose tags include {@link mealTag}. */
  useMealContext: boolean;
}

/** Active recipes only: `is_current` and not soft-deleted (matches `unsortedRecipesStore`). */
export function filterRecommendableRecipes(
  recipes: SavedRecipe[]
): SavedRecipe[] {
  return recipes.filter((r) => !r.deleted_at && r.is_current);
}

/** Latest checkout instant from ISO strings / timestamps in `checkout_history`, or null if none. */
export function getLastCheckoutMs(recipe: SavedRecipe): number | null {
  const history = recipe.checkout_history;
  if (!history?.length) return null;
  let max = -Infinity;
  for (const entry of history) {
    const ms = toMillis(entry);
    if (ms >= 0 && ms > max) max = ms;
  }
  return max === -Infinity ? null : max;
}

function filterByMealContext(
  recipes: SavedRecipe[],
  mealTag: string | null,
  useMealContext: boolean
): SavedRecipe[] {
  if (!useMealContext || !mealTag) return recipes;
  const tag = mealTag.toLowerCase();
  return recipes.filter((r) => r.tags?.some((t) => t.toLowerCase() === tag));
}

/** Non-destructive shuffle; returns a new array. */
export function shuffleAndTake<T>(items: T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

/**
 * Build recommendation sections from an arbitrary recipe array (typically from Dexie).
 * Does not mutate the input array. Stale buckets use **last** checkout only and are mutually
 * exclusive: "2 months" = 60–180 days since last cook; "6 months" = 180+ days; "never" = no checkouts.
 */
export function categorizeRecipes(
  recipes: SavedRecipe[],
  options: CategorizeRecommendationsOptions
): RecommendationCategory[] {
  const { mealTag, useMealContext } = options;
  const base = filterRecommendableRecipes(recipes);
  const now = Date.now();
  const msPerDay = 1000 * 60 * 60 * 24;
  const twoMonthsAgo = now - 60 * msPerDay;
  const sixMonthsAgo = now - 180 * msPerDay;
  const lastMonth = now - 30 * msPerDay;

  const ctx = (list: SavedRecipe[]) =>
    filterByMealContext(list, mealTag, useMealContext);

  const favoriteRecipes = base.filter((r) => r.is_favorite === true);
  const favorites = shuffleAndTake(ctx(favoriteRecipes), 8);

  const recentlyAddedRecipes = base.filter((r) => {
    const created = toMillis(r.created_at ?? '');
    if (created < 0) return false;
    const daysSinceCreated = (now - created) / msPerDay;
    return daysSinceCreated <= 30;
  });
  const recentlyAdded = shuffleAndTake(ctx(recentlyAddedRecipes), 8);

  const popularLastMonthRecipes = base.filter((r) =>
    r.checkout_history?.some((date) => toMillis(date) >= lastMonth)
  );
  const popularLastMonth = shuffleAndTake(ctx(popularLastMonthRecipes), 8);

  const mostPopularAllTimeRecipes = [...base].sort(
    (a, b) =>
      (b.checkout_history?.length ?? 0) - (a.checkout_history?.length ?? 0)
  );
  const mostPopularAllTime = shuffleAndTake(
    ctx(mostPopularAllTimeRecipes.slice(0, 10)),
    8
  );

  const notMadeIn6MonthsRecipes = base.filter((r) => {
    const last = getLastCheckoutMs(r);
    return last !== null && last < sixMonthsAgo;
  });
  const notMadeIn6Months = shuffleAndTake(ctx(notMadeIn6MonthsRecipes), 8);

  const notMadeIn2To6MonthsRecipes = base.filter((r) => {
    const last = getLastCheckoutMs(r);
    return last !== null && last < twoMonthsAgo && last >= sixMonthsAgo;
  });
  const notMadeIn2Months = shuffleAndTake(ctx(notMadeIn2To6MonthsRecipes), 8);

  const neverMadeRecipes = base.filter((r) => !r.checkout_history?.length);
  const neverMade = shuffleAndTake(ctx(neverMadeRecipes), 8);

  return [
    { id: 'favorites', title: 'Random Favorites', recipes: favorites },
    { id: 'recently-added', title: 'Recently Added', recipes: recentlyAdded },
    {
      id: 'popular-last-month',
      title: 'Made In The Last Month',
      recipes: popularLastMonth
    },
    {
      id: 'popular-all-time',
      title: 'Most Popular All Time',
      recipes: mostPopularAllTime
    },
    {
      id: 'not-made-2-months',
      title: "Haven't Made in 2–6 Months",
      recipes: notMadeIn2Months
    },
    {
      id: 'not-made-6-months',
      title: "Haven't Made in Over 6 Months",
      recipes: notMadeIn6Months
    },
    { id: 'never-made', title: 'Never Made', recipes: neverMade }
  ].filter((category) => category.recipes.length > 0);
}
