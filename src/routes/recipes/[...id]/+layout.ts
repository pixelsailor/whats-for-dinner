/**
 * @fileoverview Loads shared recipe data for the recipe detail route tree.
 * @module routes/recipes/[...id]/layout
 */

import { browser } from '$app/environment';
import { type Load, error } from '@sveltejs/kit';

import type { SavedRecipe } from '$lib/api/recipe';

import { parseRecipeRouteParams, recipeInvalidateKey } from './recipe-route';

/** Recipe detail/edit routes are Dexie-backed and therefore require the browser. */
export const ssr = false;

/**
 * Loads a local recipe snapshot for child detail/edit routes and layout data consumers.
 * @remarks Dexie remains the recipe source of truth. Detail-page mutations update local
 * session state and persist to Dexie without invalidating this load; edit save invalidates
 * this dependency before navigating back to detail because the layout param is unchanged.
 */
export const load: Load = async ({ params, depends }) => {
  if (!params.id) {
    error(404, 'Recipe route id is required.');
  }

  const { recipeId, isShared } = parseRecipeRouteParams(params.id);

  depends(recipeInvalidateKey(recipeId));

  if (isShared || !browser) {
    return { recipeId, isShared, recipe: null as SavedRecipe | null };
  }

  const { db } = await import('$lib/db');
  const recipe = (await db.recipes.get(recipeId)) as SavedRecipe | undefined;

  if (!recipe) {
    error(404, `Recipe with id "${recipeId}" not found.`);
  }

  return { recipeId, isShared, recipe };
};
