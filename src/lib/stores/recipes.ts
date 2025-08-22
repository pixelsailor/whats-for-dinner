import { liveQuery } from 'dexie';
import { readable } from 'svelte/store';
import { db } from '$lib/db/local';
import type { SavedRecipe } from '$lib/types';
import { createLiveQueryStore } from './_utils';

/** Returns all active recipes */
export const recipes = createLiveQueryStore(async () => {
	const all = await db.recipes.toArray();
	return all.filter((r) => !r.deleted_at && r.is_current);
});

// Get a single recipe
export async function getSavedRecipe(id: string) {
	return await db.recipes.get(id);
}

/** Returns recipes that have been deleted */
export const deletedRecipes = createLiveQueryStore(async () => {
	const all = await db.recipes.toArray();
	const deleted = all.filter((r) => r.deleted_at && r.is_current);
	if (deleted.length > 0) {
		return deleted.sort((a, b) => b.deleted_at! - a.deleted_at!);
	} else {
		return deleted;
	}
});

/** Returns the 10 most recently opened recipes  */
export const recentlyOpened = readable<SavedRecipe[]>([], (recipes) => {
	const subscription = liveQuery(async () => {
		const all = await db.recipes.toArray();
		return all
			.filter((r) => !r.deleted_at && r.is_current)
			.sort((a, b) => b.last_opened - a.last_opened)
			.slice(0, 9);
	}).subscribe(recipes);
	return () => subscription.unsubscribe();
});
