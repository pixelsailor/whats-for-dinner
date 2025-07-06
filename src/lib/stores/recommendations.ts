import { db } from '$lib/db';
import { getMealContext } from '$lib/getMealContext';
import { createLiveQueryStore } from './_utils';

export const recommendedRecipes = createLiveQueryStore(async () => {
	const mealType = getMealContext();

	const all = (await db.recipes.toArray()).filter((r) => !r.archived);

	// Filter by context (meal time) if tags exist
	const contextFiltered = all.filter((r) => r.tags?.some((t) => t.toLowerCase() === mealType));

	const list = contextFiltered.length > 0 ? contextFiltered : all;

	// Sort by least recently opened
	list.sort((a, b) => (a.last_opened ?? 0) - (b.last_opened ?? 0));

	// Add randomness: shuffle lower-ranked items
	const top = list.slice(0, 24);
	const shuffled = top.sort(() => Math.random() - 0.5);

	// Limit to 6
	return shuffled.slice(0, 8);
});
