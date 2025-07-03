import { liveQuery } from 'dexie';
import { readable } from 'svelte/store';
import { db } from '$lib/db';
import type { SavedRecipe } from '$lib/types';
import { createLiveQueryStore } from './_utils';

export const savedRecipes = readable<SavedRecipe[]>([], (recipes) => {
	const subscription = liveQuery(async () => {
		const all = await db.recipes.toArray();
		return all.filter((r) => !r.archived && r.is_current);
	}).subscribe(recipes);
	return () => subscription.unsubscribe();
});

export const recipes = createLiveQueryStore(async () => {
	const all = await db.recipes.toArray();
	return all.filter((r) => !r.archived && r.is_current);
});

// Get a single recipe
export async function getSavedRecipe(id: string) {
	return await db.recipes.get(id);
}

export const archivedRecipes = createLiveQueryStore(async () => {
	const all = await db.recipes.toArray();
	const archived = all.filter((r) => r.archived && r.is_current);
	if (archived.length > 0) {
		return archived.sort((a, b) => b.archived! - a.archived!);
	} else {
		return archived;
	}
});

export const recentlyOpened = readable<SavedRecipe[]>([], (recipes) => {
	const subscription = liveQuery(async () => {
		const all = await db.recipes.toArray();
		return all
			.filter((r) => !r.archived && r.is_current)
			.sort((a, b) => b.last_opened - a.last_opened)
			.slice(0, 9);
	}).subscribe(recipes);
	return () => subscription.unsubscribe();
});
