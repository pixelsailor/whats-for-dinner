/**
 * Suggestions Store
 * 
 * Stores AI suggestions locally to maintain a history to facilitate later retrieval and "viewed" status.
 */

import { useQueryClient } from '@tanstack/svelte-query';
import { liveQuery } from 'dexie';
import { readable, writable } from 'svelte/store';

import type { RecipeSummary, Suggestion } from '$lib/api/recipe';
import { db } from '$lib/db';
import { createLiveQueryStore } from './_utils';

// @TODO is this used?
export const suggestionMap = writable<Map<string, RecipeSummary>>(new Map());

/** Manages state for requesting suggestions from OpenAI */
export const pendingSuggestionRequest = writable(null);

/** Allows form requests to be passed from one page to another before calling the API */
// export function startSuggestionRequest(requestPromise: Promise<any>, requestId) {
// 	const requestData = {
// 		id: requestId,
// 		promise: requestPromise,
// 		status: 'loading'
// 	};

// 	pendingSuggestionRequest.set(requestData);

// 	requestPromise
// 		.then((result) => {
// 			pendingSuggestionRequest.update((current) => {
// 				return current?.id === requestId ? { ...current, status: 'success', result } : current;
// 			});
// 		})
// 		.catch((err) => {
// 			pendingSuggestionRequest.update((current) => {
// 				return current?.id === requestId ? {...current, status: 'error', err } : current;
// 			})
// 		});
// }

/**
 * Returns the suggestion history in its entirety, most recent first
 */
export const suggestionHistory = readable<Suggestion[]>([], (suggestions) => {
  const subscription = liveQuery(async () => {
    return db.suggestions.orderBy('created_at').reverse().toArray();
  }).subscribe(suggestions);

  return () => subscription.unsubscribe();
});

export const suggestionsStore = createLiveQueryStore(async () => {
	// await migrateIdsToSids();
	return await db.suggestions.orderBy('created_at').reverse().toArray() as Suggestion[];
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
 * Saves a set of suggestions using dexie's bulkPut. This function is idempotent:
 * existing suggestions preserve their original `created_at` timestamp.
 * If the total suggestion count exceeds the limit cap, remove old suggestions from the DB.
 * 
 * @param suggestions - the set of RecipeSummaries to save as Suggestions
 * @todo - Move this somewhere more appropriate so that it's not in the store file
 */
export async function saveSuggestions(suggestions: RecipeSummary[]) {
	const now = new Date().toISOString();
	const ids = suggestions.map((s) => s.sid);
	
	// Fetch existing suggestions to preserve their created_at timestamps
	const existing = await db.suggestions.bulkGet(ids);
	const existingMap = new Map(
		existing.filter((s): s is Suggestion => s !== undefined).map((s) => [s.id, s])
	);

	const enriched: Suggestion[] = suggestions.map((raw) => {
		const existingRow = existingMap.get(raw.sid);
		return {
			...raw,
			// Preserve existing created_at or use current timestamp for new suggestions
			created_at: existingRow?.created_at ?? now,
			// Preserve last_opened if it exists
			last_opened: existingRow?.last_opened
		};
	});

	await db.suggestions.bulkPut(enriched);

	// Prune old suggestions beyond 100-item limit
	const count = await db.suggestions.count();
	if (count > MAX_SUGGESTIONS) {
		const extras = await db.suggestions
			.orderBy('created_at')
			.limit(count - MAX_SUGGESTIONS)
			.toArray();

		const extraIds = extras.filter((s): s is Suggestion => s !== undefined).map((s) => s.id);
		if (!extraIds?.length) return;
		await db.suggestions.bulkDelete(extraIds as string[]);
	}
}

export async function deleteSuggestion(id: string) {
	await db.suggestions.delete(id);
}

/**
 * Bulk delete all stored `suggestions`
 */
export async function bulkDeleteSuggestions() {
	const collection = db.suggestions.toCollection();
	const keys = await collection.primaryKeys();
	await db.suggestions.bulkDelete(keys);
}

/**
 * Get a saved suggestion by id
 * @param id - The id of the suggestion to return.
 * @returns The saved suggestion.
 * @throws An error if the suggestion is not found.
 */
export const suggestionStoreById = (id: string) => createLiveQueryStore(async () => {
	const suggestion = await db.suggestions.get(id) as Suggestion | undefined;
	if (!suggestion) {
		throw new Error(`Suggestion with id "${id}" not found.`);
	}
	return suggestion;
});

/**
 * Check if a suggestion has been viewed (either in session cache or persisted to DB)
 * @param suggestion - The suggestion to check
 * @param recipeTitle - The recipe title to check in TanStack Query cache
 * @returns Object with isViewed (session or persisted) and isPersisted (DB only) flags
 */
export function getViewedStatus(
	suggestion: Suggestion | RecipeSummary,
	recipeTitle?: string
): { isViewed: boolean; isPersisted: boolean } {
	// Check if persisted to database
	const isPersisted = 'last_opened' in suggestion && !!suggestion.last_opened;
	
	// Check if in session cache (TanStack Query)
	let isViewedInSession = false;
	if (recipeTitle) {
		try {
			const queryClient = useQueryClient();
			const cachedData = queryClient.getQueryData(['detail', recipeTitle]);
			isViewedInSession = !!cachedData;
		} catch (error) {
			// Query client might not be available in some contexts
			console.warn('Could not check TanStack Query cache:', error);
		}
	}
	
	// A suggestion is viewed if it's either in session cache OR persisted to DB
	const isViewed = isViewedInSession || isPersisted;
	
	return { isViewed, isPersisted };
}

async function migrateIdsToSids(): Promise<void> {
	const suggestions = await db.suggestions.toArray() as Suggestion[];
	for (const suggestion of suggestions) {
		if (suggestion.id) continue;
		suggestion.sid = suggestion.id as string;
		suggestion.id = undefined;
		await db.suggestions.put(suggestion);
	}
}