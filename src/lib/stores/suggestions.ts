/**
 * Suggestions Store
 *
 * Stores AI suggestions locally to maintain a history to facilitate later retrieval and "viewed" status.
 * Also tracks prompt requests to prevent duplicate OpenAI API calls.
 */

import { useQueryClient } from '@tanstack/svelte-query';
import { liveQuery } from 'dexie';
import { readable, writable } from 'svelte/store';

import type { RecipeSummary, Suggestion } from '$lib/api/recipe';
import { type PromptRequest, db } from '$lib/db';
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
  return (await db.suggestions.orderBy('created_at').reverse().toArray()) as Suggestion[];
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
  const ids = suggestions.map((s) => s.id);
  // Fetch existing suggestions by primary key (id)
  const existing = await db.suggestions.bulkGet(ids);
  const existingMap = new Map(existing.filter((s): s is Suggestion => s !== undefined).map((s) => [s.id, s]));

  const enriched: Suggestion[] = suggestions.map((raw) => {
    const existingRow = existingMap.get(raw.id);

    // Existing row: preserve primary key and timestamps
    if (existingRow) {
      return {
        ...existingRow,
        ...raw,
        id: existingRow.id,
        created_at: existingRow.created_at ?? now,
        last_opened: existingRow.last_opened,
        recipe_id: existingRow.recipe_id ?? null
      };
    }

    // New row: ensure recipe_id exists (nullable)
    return {
      ...raw,
      created_at: now,
      last_opened: undefined,
      recipe_id: null
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

// =============================================================================
// Prompt Request Functions
// Used for request deduplication and throttling
// =============================================================================

/**
 * Get the most recent prompt request for a given prompt string.
 *
 * @param prompt - The sanitized prompt string to look up
 * @returns The most recent PromptRequest or null if not found
 */
export async function getPromptRequest(prompt: string): Promise<PromptRequest | null> {
  const requests = await db.prompt_requests.where('prompt').equals(prompt).toArray();

  if (requests.length === 0) return null;

  // Return the most recent request (highest request_id)
  return requests.reduce((latest, current) => (current.request_id > latest.request_id ? current : latest));
}

/**
 * Check if a prompt request exists within a time threshold.
 * Used to prevent duplicate API calls within a short window.
 *
 * @param prompt - The sanitized prompt string to check
 * @param thresholdMs - Time threshold in milliseconds (default 5000ms / 5 seconds)
 * @returns The existing request if within threshold, null otherwise
 */
export async function getPromptRequestWithThrottle(prompt: string, thresholdMs: number = 5000): Promise<PromptRequest | null> {
  const request = await getPromptRequest(prompt);
  if (!request) return null;

  const age = Date.now() - request.request_id;
  return age < thresholdMs ? request : null;
}

/**
 * Save a prompt request along with its resulting suggestion IDs.
 * This links the prompt to its suggestions for later retrieval.
 *
 * @param requestId - Unique timestamp ID (Date.now())
 * @param prompt - The sanitized prompt string
 * @param suggestions - Array of RecipeSummary objects returned by the API
 */
export async function savePromptRequest(requestId: number, prompt: string, suggestions: RecipeSummary[]): Promise<void> {
  const promptRequest: PromptRequest = {
    request_id: requestId,
    prompt,
    created_at: new Date().toISOString(),
    suggestion_ids: suggestions.map((s) => s.id)
  };

  await db.prompt_requests.put(promptRequest);
}

/**
 * Create a LiveQuery store for suggestions filtered by a specific prompt.
 * Uses the prompt_requests table to find the associated suggestion IDs.
 *
 * @param prompt - The prompt string to filter suggestions by (or null for no filtering)
 * @returns A LiveQuery store containing the filtered suggestions, or null if no prompt
 */
export function suggestionsByPromptStore(prompt: string | null) {
  if (!prompt) return null;

  return createLiveQueryStore(async () => {
    // First get the prompt request to find associated suggestion IDs
    const request = await getPromptRequest(prompt);
    if (!request || request.suggestion_ids.length === 0) {
      return [] as Suggestion[];
    }

    // Fetch suggestions by primary key (request stores ids)
    const suggestions = await db.suggestions.bulkGet(request.suggestion_ids);
    return suggestions.filter((s): s is Suggestion => s !== undefined);
  });
}

/**
 * Get suggestions for a prompt request, returning them from Dexie.
 * This is a one-time fetch (not reactive).
 *
 * @param prompt - The prompt string to get suggestions for
 * @returns Array of suggestions associated with the prompt
 */
export async function getSuggestionsForPrompt(prompt: string): Promise<Suggestion[]> {
  const request = await getPromptRequest(prompt);
  if (!request || request.suggestion_ids.length === 0) {
    return [];
  }

  const suggestions = await db.suggestions.bulkGet(request.suggestion_ids);
  return suggestions.filter((s): s is Suggestion => s !== undefined);
}

/**
 * Get a saved suggestion by id
 * @param id - The id of the suggestion to return.
 * @returns The saved suggestion.
 * @throws An error if the suggestion is not found.
 */
export const suggestionStoreById = (id: string) =>
  createLiveQueryStore(async () => {
    const suggestion = (await db.suggestions.get(id)) as Suggestion | undefined;
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
export function getViewedStatus(suggestion: Suggestion | RecipeSummary, recipeTitle?: string): { isViewed: boolean; isPersisted: boolean } {
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
