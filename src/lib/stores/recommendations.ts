import { db } from '$lib/db';
import { getMealContext } from '$lib/getMealContext';
import { createLiveQueryStore } from './_utils';

export const recommendedRecipes = createLiveQueryStore(async () => {
	const mealType = getMealContext();

	const all = (await db.recipes.toArray()).filter((r) => !r.archived);

	if (all.every((r) => !r.last_opened)) {
		return all
			.filter(r => !r.archived)
			.sort((a, b) => b.created_at - a.created_at)
			.slice(0, 6);
	}

	let candidates = all.filter(r => {
		const daysSinceOpened = dayDiff(r.last_opened, Date.now());
		return daysSinceOpened >= 10 && daysSinceOpened <= 30;
	});

	if (candidates.length < 6) {
		const additional = all
			.filter(r => !candidates.includes(r) && !r.archived)
			.sort((a, b) => a.last_opened - b.last_opened)
			// .slice(0, 6 - candidates.length);
		candidates = [...candidates, ...additional];
	}

	// Filter by context (meal time) if tags exist
	let contextualMatches = all.filter((r) => r.tags?.some((t) => t.toLowerCase() === mealType));

	if (contextualMatches.length === 0) {
		contextualMatches = candidates; // skip meal type filtering
	}

	if (contextualMatches.length === 0) {
		return [];
	}

	// const list = contextFiltered.length > 0 ? contextFiltered : all;

	// Sort by least recently opened
	// list.sort((a, b) => (a.last_opened ?? 0) - (b.last_opened ?? 0));

	// Add randomness: shuffle lower-ranked items
	const top = contextualMatches.slice(0, 24);
	const shuffled = top.sort(() => Math.random() - 0.5);

	// Limit to 6
	return shuffled.slice(0, 6);
});

function dayDiff(a: number | undefined, b: number = Date.now()): number {
	if (!a) return Infinity;
	const msPerDay = 1000 * 60 * 60 * 24;
	return Math.floor(Math.abs(b - a) / msPerDay);
}