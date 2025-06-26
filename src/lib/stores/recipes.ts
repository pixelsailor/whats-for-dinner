import { liveQuery } from 'dexie';
import { readable } from 'svelte/store';
import { db } from '$lib/db';
import type { SavedRecipe } from '$lib/types';

export const savedRecipes = readable<SavedRecipe[]>([], (recipes) => {
	const subscription = liveQuery(async() => db.recipes.toArray()).subscribe(recipes);
	return () => subscription.unsubscribe();
});

// Get a single recipe
export async function getSavedRecipe(id: string) {
  return await db.recipes.get(id);
}