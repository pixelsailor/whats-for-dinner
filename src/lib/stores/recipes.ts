/**
 * Recipes Store
 * 
 * Handles the state for recipes, both active and deleted.
 * 
 * Provides a consistent interface for interacting with local recipes, both active and deleted.
 * LiveQueryStores are used to subscribe to changes in the database and update the store accordingly.
 * The LiveQueryStore response object contains the data, loading state, and error state:
 * 
 * ```
 * {
 *   data: SavedRecipe[] | null;
 *   loading: boolean;
 *   error: Error | null;
 * }
 * ```
 * 
 * @see src/lib/stores/_utils.ts
 */

import { liveQuery } from 'dexie';
import { readable } from 'svelte/store';
import { db } from '$lib/db';
import type { SavedRecipe } from '$lib/api/recipe';
import { createLiveQueryStore } from './_utils';

/** Returns all active recipes sorted by title */
export const recipesStore = createLiveQueryStore(async () => {
	const all = await db.recipes.toArray() as unknown as SavedRecipe[] | undefined;
	if (!all) {
		return [];
	}
	const active = all.filter((r) => !r.deleted_at && r.is_current);
	return active.sort((a, b) => a.title.localeCompare(b.title));
});

export const unsortedRecipesStore = createLiveQueryStore(async () => {
	const all = await db.recipes.toArray() as unknown as SavedRecipe[] | undefined;
	if (!all) {
		return [];
	}
	return all.filter((r) => !r.deleted_at && r.is_current);
});

/**
 * Returns a single recipe by id
 * 
 * @param id - The id of the recipe to return.
 * @returns A store that contains the recipe.
 * @example
 * ```typescript
 * const recipe = singleRecipeStore('123');
 * $recipe.data; // { id: '123', name: 'Recipe 1' }
 * ```
 */
export const getRecipeStore = (id: string) => createLiveQueryStore(async () => {
	const recipe = await db.recipes.get(id) as SavedRecipe | undefined;
	if (!recipe) {
		throw new Error(`Recipe with id "${id}" not found.`);
	}
	return recipe;
});

/** Returns recipes that have been deleted */
export const deletedRecipesStore = createLiveQueryStore(async () => {
	const all = await db.recipes.toArray() as unknown as SavedRecipe[] | undefined;
	if (!all) {
		return [];
	}
	const deleted = all.filter((r) => r.deleted_at != null);
	if (deleted.length > 0) {
		return deleted.sort((a, b) => (new Date(b.deleted_at!).getTime() - new Date(a.deleted_at!).getTime()));
	} else {
		return deleted;
	}
});

/**
 * Returns the 10 most recently opened recipes
 * @deprecated Use `recentlyOpenedStore` instead. @see src/lib/stores/recipes.ts
 */
export const recentlyOpened = readable<SavedRecipe[]>([], (recipes) => {
	const subscription = liveQuery(async () => {
		const all = await db.recipes.toArray();
		return all
			.filter((r) => r.deleted_at == null)
			.sort((a, b) => (new Date(b.last_opened).getTime() - new Date(a.last_opened).getTime()))
			.slice(0, 9);
	}).subscribe(recipes);
	return () => subscription.unsubscribe();
});

/** Returns the 10 most recently opened recipes */
export const recentlyOpenedStore = createLiveQueryStore(async () => {
	const all = await db.recipes.toArray() as unknown as SavedRecipe[] | undefined;
	if (!all) {
		return [];
	}
	return all.filter((r) => r.deleted_at == null)
		.sort((a, b) => (new Date(b.last_opened).getTime() - new Date(a.last_opened).getTime()))
		.slice(0, 9);
});
