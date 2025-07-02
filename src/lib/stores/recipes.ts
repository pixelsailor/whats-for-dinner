import { liveQuery } from 'dexie';
import { readable, writable } from 'svelte/store';
import { db } from '$lib/db';
import type { SavedRecipe } from '$lib/types';
import { browser } from '$app/environment';
import { createLiveQueryStore } from './_utils';

// Store for unsaved recipes
export const recipeCache = writable(new Map());

// // Init sessionStorage cache
// if (browser) {
// 	const stored = sessionStorage.getItem('recipeCache');
// 	if (stored) {
// 		try {
// 			const parsedCache = JSON.parse(stored);
// 			recipeCache.set(new Map(Object.entries(parsedCache)));
// 		} catch (err) {
// 			console.warn('Failed to parse cached data', err);
// 		}
// 	}
// }

// // Subscribe to cache changes and sync with sessionStorage
// if (browser) {
// 	recipeCache.subscribe((cache) => {
// 		const cacheObject: string = Object.fromEntries(cache);
// 		sessionStorage.setItem('recipeCache', cacheObject);
// 	})
// }

// Cache helper functions
export const getCachedRecipe = (title: string) => {
	let cachedData = null;
	recipeCache.subscribe((cache) => {
		cachedData = cache.get(title);
	})();
	return cachedData;
};

/**
 * Write the recipe to cache
 * @param title - Title of the recipe
 * @param data - JSON string of the recipe
 */
export const setCachedRecipe = (title: string, data: string) => {
	recipeCache.update((cache) => {
		cache.set(title, data);
		return cache;
	});
};

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
