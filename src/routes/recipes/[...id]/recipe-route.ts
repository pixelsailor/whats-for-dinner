/**
 * @fileoverview Provides route helpers for recipe detail and edit pages.
 * @module routes/recipes/[...id]/recipe-route
 */

/** Parsed `[...id]` route segment for a local recipe or shared placeholder. */
export type ParsedRecipeRouteParams = {
  /** Local recipe id or shared token segment. */
  recipeId: string;
  /** Whether the path denotes a shared recipe route. */
  isShared: boolean;
};

/**
 * Parses the `[...id]` rest param into a recipe id and shared-route flag.
 * @param path - Raw `params.id` value from the route
 * @returns Recipe id and whether the route targets a shared recipe
 */
export function parseRecipeRouteParams(path: string): ParsedRecipeRouteParams {
  const isShared = path.startsWith('shared/');
  const recipeId = isShared ? (path.split('/')[1] ?? path) : path;

  return { recipeId, isShared };
}

/**
 * Builds the SvelteKit dependency key for a recipe layout load.
 * @param recipeId - Local recipe id
 * @returns Dependency key used by `depends` and `invalidate`
 */
export function recipeInvalidateKey(recipeId: string): `recipe:${string}` {
  return `recipe:${recipeId}`;
}

/**
 * Builds a recipe-scoped AI query key that changes after permanent recipe edits.
 * @param recipeId - Local recipe id
 * @param updatedAt - Recipe update timestamp
 * @returns TanStack query key for future AI assistance queries
 */
export function recipeAiQueryKey(recipeId: string, updatedAt: string) {
  return ['recipe-ai', recipeId, updatedAt] as const;
}
