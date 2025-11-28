import type {
	FullRecipe,
	OpenAiApiResponse,
	PromptContext,
	RecipeSummary
} from '$lib/types';
import { sanitizePromptInput } from '$lib/utils';
import { createQuery } from '@tanstack/svelte-query';

/**
 * Options for the query.
 * 
 * @param enabled - Whether the query is enabled.
 */
type QueryOptions = {
	enabled?: boolean;
};

type QueryArgs = {
	action: PromptContext;
	prompt: string;
	recipe?: string;
	preferences?: string;
};

/**
 * Query the API for a recipe.
 * 
 * @param action - The action to perform.
 * @param prompt - The prompt to use for the query.
 * @param recipe - The recipe to use for the query.
 * @param preferences - The preferences to use for the query.
 * @returns The response from the API.
 */
async function query<TPayload>({ action, prompt, recipe, preferences }: QueryArgs) {
	const body: Record<string, unknown> = { action, prompt };
	if (recipe !== undefined) body.recipe = recipe;
	if (preferences !== undefined) body.preferences = preferences;

	const response = await fetch('/api/recipes', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});

	if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

	return response.json() as Promise<OpenAiApiResponse<TPayload>>;
}

// Tanstack Query functions for caching. It's expected that URI prompts have been encoded

// `createAssistanceQuery` and `createRevisionQuery` should not be cached. Keeping them so that
// api calls can maintain a consistent usage format but these are not necessary and could hinder
// sending requests to openai

/**
 * Create a query for assistance.
 * 
 * @param prompt - The prompt to use for the query.
 * @param recipe - The recipe to use for the query.
 * @param options - The options to use for the query.
 * @returns A query for assistance.
 */
export function createAssistanceQuery(prompt: string, recipe: string, options?: QueryOptions) {
	const sanitizedPrompt = sanitizePromptInput(decodeURIComponent(prompt));
	return createQuery({
		queryKey: ['assistance', sanitizedPrompt],
		queryFn: () => query<string>({ action: 'assistance', prompt: sanitizedPrompt, recipe }),
		enabled: Boolean(sanitizedPrompt.length) && (options?.enabled ?? true)
		// staleTime: Infinity
	});
}

/**
 * Create a query for a full recipe.
 * 
 * @param prompt - The prompt to use for the query.
 * @param recipe - The recipe to use for the query.
 * @param options - The options to use for the query.
 * @returns A query for a full recipe.
 */
export function createFullRecipeQuery(prompt: string, recipe: string, options?: QueryOptions) {
	const sanitizedPrompt = sanitizePromptInput(decodeURIComponent(prompt));
	const sanitizedDesc = sanitizePromptInput(decodeURIComponent(recipe));
	return createQuery({
		queryKey: ['detail', sanitizedPrompt],
		queryFn: () =>
			query<FullRecipe>({ action: 'detail', prompt: sanitizedPrompt, recipe: sanitizedDesc }),
		enabled: Boolean(sanitizedPrompt.length) && (options?.enabled ?? true),
		staleTime: Infinity
	});
}

/**
 * Create a query for recipe revisions.
 * 
 * @param prompt - The prompt to use for the query.
 * @param recipe - The recipe to use for the query.
 * @param options - The options to use for the query.
 * @returns A query for recipe revisions.
 */
export function createRevisionQuery(prompt: string, recipe: string, options?: QueryOptions) {
	const sanitizedPrompt = sanitizePromptInput(decodeURIComponent(prompt));
	return createQuery({
		queryKey: ['revision', sanitizedPrompt],
		queryFn: () => query<FullRecipe>({ action: 'revision', prompt: sanitizedPrompt, recipe }),
		enabled: Boolean(sanitizedPrompt.length) && (options?.enabled ?? true)
		// staleTime: Infinity
	});
}

/**
 * Create a query for recipe suggestions.
 * 
 * @param prompt - The prompt to use for the query.
 * @param preferences - The preferences to use for the query.
 * @param options - The options to use for the query.
 * @returns A query for recipe suggestions.
 */
export function createSuggestionsQuery(
	prompt: string | null,
	preferences?: string,
	options?: QueryOptions
) {
	if (!prompt) return null;

	const sanitizedPrompt = sanitizePromptInput(decodeURIComponent(prompt));
	const prefs = preferences ? sanitizePromptInput(preferences) : '';

	return createQuery({
		queryKey: ['summaries', sanitizedPrompt],
		queryFn: () =>
			query<RecipeSummary[]>({ action: 'summaries', prompt: sanitizedPrompt, preferences: prefs }),
		enabled: Boolean(sanitizedPrompt.length) && (options?.enabled ?? true),
		staleTime: Infinity
	});
}
