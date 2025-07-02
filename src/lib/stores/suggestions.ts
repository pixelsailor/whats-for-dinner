import { db } from '$lib/db';
import type { RecipeSummary, Suggestion } from '$lib/types';
import { liveQuery } from 'dexie';
import { readable, writable } from 'svelte/store';
import { v4 as uuid } from 'uuid';

export const suggestionMap = writable<Map<string, RecipeSummary>>(new Map());

/**
 * Returns the suggestion history in its entirety, most recent first
 */
export const suggestionHistory = readable<Suggestion[]>([], (suggestions) => {
  const subscription = liveQuery(async () => {
    return db.suggestions.orderBy('created_at').reverse().toArray();
  }).subscribe(suggestions);

  return () => subscription.unsubscribe();
});

/**
 * Returns a list of the most recent suggestions as a LiveQuery subscription
 */
export const recentSuggestions = readable<Suggestion[]>([], (suggestions) => {
	const sub = liveQuery(() => {
		return db.suggestions.orderBy('created_at').reverse().limit(10).toArray();
	}).subscribe(suggestions);

	return () => sub.unsubscribe();
});

const MAX_SUGGESTIONS = 100;

/**
 * Saves a set of suggestions using dexie's bulkAdd. If the total suggestion count exceeds the limit
 * cap, remove old suggestions for the DB
 * 
 * @param suggestions - the set of RecipeSummaries to save as Suggestions
 * @todo - Move this somewhere more appropriate so that it's not in the store file
 */
export async function saveSuggestions(suggestions: RecipeSummary[]) {
	const now = Date.now();
	const enriched: Suggestion[] = suggestions.map((s) => ({
		...s,
		id: uuid(),
		created_at: now
	}));

	await db.suggestions.bulkAdd(enriched);

	// Prune old suggestions beyond 100-item limit
	const count = await db.suggestions.count();
	if (count > MAX_SUGGESTIONS) {
		const extras = await db.suggestions
			.orderBy('created_at')
			.limit(count - MAX_SUGGESTIONS)
			.toArray();

		const extraIds = extras.map((s) => s.id);
		await db.suggestions.bulkDelete(extraIds);
	}
}
