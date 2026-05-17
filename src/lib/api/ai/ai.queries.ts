/**
 * Tanstack Query functions for caching. It's expected that URI prompts have been encoded
 */
import { error } from '@sveltejs/kit';
import { createQuery } from '@tanstack/svelte-query';

import { sanitizePromptInput } from '$lib/utils';
import type { PromptContext, RecipeDetailResponse, RecipeSuggestionsResponse } from './ai.types';

const endpoints = {
  recipe: '/api/suggestions/recipe',
  recipes: '/api/recipes',
  suggestions: '/api/suggestions'
};

type Endpoint = keyof typeof endpoints;

/**
 * Options for the query.
 */
type QueryOptions = {
  staleTime?: number;
  enabled?: boolean;
};

type QueryArgs = {
  prompt: string;
  action?: PromptContext;
  recipe?: string;
  preferences?: string;
  endpoint: Endpoint;
  options?: QueryOptions;
};

/**
 * Query the API for a recipe.
 *
 * Creates a Tanstack query function for the given endpoint.
 * Requests and Responses are handled by the API server route.
 *
 * @param prompt - The URI encoded prompt input.
 * @param action - Legacy parameter for the action to perform.
 * @param recipe - The recipe title and description as a string.
 * @param preferences - User preferences as a JSON string.
 * @param endpoint - The endpoint to use for the query.
 * @returns The Tanstack Query response as a Fetch API response.
 */
async function query<TPayload>({ prompt, recipe, preferences, endpoint }: QueryArgs) {
  const body: Record<string, string> = { prompt };
  if (recipe !== undefined) body.recipe = recipe;
  if (preferences !== undefined) body.preferences = preferences;

  const response = await fetch(endpoints[endpoint], {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) error(response.status || 500, response.statusText || 'An unknown error occurred');

  return response.json() as Promise<TPayload>;
}

/**
 * Create a query for recipe suggestions.
 *
 * @param prompt - The prompt to use for the query.
 * @param preferences - The preferences to use for the query.
 * @param options - The options to use for the query.
 * @returns A query for recipe suggestions.
 */
export function createSuggestionsQuery({ prompt, preferences, options, endpoint = 'suggestions' }: Partial<QueryArgs>) {
  if (!prompt) {
    throw new Error('A prompt is required to create a suggestions query');
  }

  const sanitizedPrompt = sanitizePromptInput(decodeURIComponent(prompt));
  const prefs = preferences ? sanitizePromptInput(preferences) : 'No preferences or dietary restrictions provided.';

  return createQuery({
    queryKey: ['suggestions', sanitizedPrompt],
    queryFn: () => query<RecipeSuggestionsResponse>({ endpoint, prompt: sanitizedPrompt, preferences: prefs, action: 'summaries' }),
    enabled: Boolean(sanitizedPrompt.length) && (options?.enabled ?? true),
    staleTime: Infinity
  });
}

/**
 * Create a query for a full recipe.
 *
 * Generated recipes should be cached indefinitely to prevent the AI from generating different
 * versions of the same recipe.
 *
 * @param prompt - The URI encoded prompt input. Should contain the recipe title and description.
 * @param preferences - The user preferences and dietary restrictions as a JSON string.
 * @param options - The options to use for the query.
 * @returns A query for a full recipe.
 */
export function createFullRecipeQuery({
  title,
  description,
  preferences,
  options,
  endpoint = 'recipe'
}: {
  title: string;
  description: string;
  preferences?: string;
  options?: QueryOptions;
  endpoint?: Endpoint;
}) {
  if (!title || !description) {
    throw new Error('A title and description are required to create a full recipe query');
  }

  const sanitizedTitle = sanitizePromptInput(decodeURIComponent(title));
  const sanitizedDescription = sanitizePromptInput(decodeURIComponent(description));
  const prompt = JSON.stringify({ title: sanitizedTitle, description: sanitizedDescription });
  const prefs = preferences ? sanitizePromptInput(preferences) : 'No preferences or dietary restrictions provided.';

  return createQuery({
    queryKey: ['suggestedrecipe', sanitizedTitle],
    queryFn: () => query<RecipeDetailResponse>({ endpoint, prompt, preferences: prefs }),
    enabled: Boolean(sanitizedTitle.length) && (options?.enabled ?? true),
    staleTime: Infinity
  });
}
