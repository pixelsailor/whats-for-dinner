/**
 * @fileoverview TanStack Query factories for AI suggestion HTTP routes.
 * @module lib/api/ai/ai.queries
 */

import { createQuery } from '@tanstack/svelte-query';

import { sanitizePromptInput } from './ai.model';

import { AI_ENDPOINTS, postAiJson, postSuggestedRecipe, postSuggestions } from './ai.service';
import type { RecipeSuggestionsResponse, SuggestedRecipeResponse } from './ai.types';

type Endpoint = keyof typeof AI_ENDPOINTS;

/**
 * Options for the query.
 */
type QueryOptions = {
  staleTime?: number;
  enabled?: boolean;
};

/**
 * Create a query for recipe suggestions.
 *
 * @param prompt - The prompt to use for the query.
 * @param preferences - The preferences to use for the query.
 * @param options - The options to use for the query.
 * @returns A query for recipe suggestions.
 */
export function createSuggestionsQuery({
  prompt,
  preferences,
  options,
  endpoint = 'suggestions'
}: {
  prompt?: string;
  preferences?: string;
  options?: QueryOptions;
  endpoint?: Endpoint;
}) {
  if (!prompt) {
    throw new Error('A prompt is required to create a suggestions query');
  }

  const sanitizedPrompt = sanitizePromptInput(decodeURIComponent(prompt));
  const prefs = preferences ? sanitizePromptInput(preferences) : 'No preferences or dietary restrictions provided.';

  return createQuery<RecipeSuggestionsResponse>(() => ({
    queryKey: ['suggestions', sanitizedPrompt],
    queryFn: () => {
      if (endpoint === 'suggestions') {
        return postSuggestions(sanitizedPrompt, prefs);
      }

      return postAiJson<RecipeSuggestionsResponse>(AI_ENDPOINTS[endpoint], {
        prompt: sanitizedPrompt,
        preferences: prefs
      });
    },
    enabled: Boolean(sanitizedPrompt.length) && (options?.enabled ?? true),
    staleTime: Infinity
  }));
}

/**
 * Create a query for a full recipe.
 *
 * Generated recipes should be cached indefinitely to prevent the AI from generating different
 * versions of the same recipe.
 *
 * @param title - Recipe title (URI-encoded when passed from the route)
 * @param description - Short description
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

  return createQuery<SuggestedRecipeResponse>(() => ({
    queryKey: ['suggestedrecipe', sanitizedTitle],
    queryFn: () => {
      if (endpoint === 'recipe') {
        return postSuggestedRecipe(prompt, prefs);
      }

      return postAiJson<SuggestedRecipeResponse>(AI_ENDPOINTS[endpoint], { prompt, preferences: prefs });
    },
    enabled: Boolean(sanitizedTitle.length) && (options?.enabled ?? true),
    staleTime: Infinity
  }));
}
