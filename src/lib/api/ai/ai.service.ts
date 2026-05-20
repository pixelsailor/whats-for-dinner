/**
 * @fileoverview Same-origin HTTP client for AI API routes (no provider secrets).
 * @module lib/api/ai/ai.service
 */

import { error } from '@sveltejs/kit';

import type { RecipeSuggestionsResponse, SuggestedRecipeResponse } from './ai.types';

/** Same-origin AI route paths used by TanStack query factories. */
export const AI_ENDPOINTS = {
  recipe: '/api/suggestions/recipe',
  recipes: '/api/recipes',
  suggestions: '/api/suggestions'
} as const;

export type AiEndpoint = keyof typeof AI_ENDPOINTS;

/**
 * POST body fields shared by suggestion and recipe generation routes.
 */
export type PostAiBody = {
  prompt: string;
  preferences?: string;
  recipe?: string;
};

/**
 * POSTs JSON to an AI route and returns the parsed response body.
 * @param url - Same-origin path
 * @param body - Request payload
 * @returns Parsed JSON body on success
 * @throws SvelteKit `error()` when the response is not OK
 */
export async function postAiJson<T>(url: string, body: PostAiBody): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    error(response.status || 500, response.statusText || 'An unknown error occurred');
  }

  return response.json() as Promise<T>;
}

/**
 * Fetches recipe suggestions for a prompt.
 * @param prompt - Sanitized user prompt
 * @param preferences - Serialized user preferences text
 */
export async function postSuggestions(prompt: string, preferences?: string): Promise<RecipeSuggestionsResponse> {
  return postAiJson<RecipeSuggestionsResponse>(AI_ENDPOINTS.suggestions, { prompt, preferences });
}

/**
 * Fetches a full generated recipe for a title/description prompt payload.
 * @param prompt - JSON string `{ title, description }`
 * @param preferences - Serialized user preferences text
 */
export async function postSuggestedRecipe(prompt: string, preferences?: string): Promise<SuggestedRecipeResponse> {
  return postAiJson<SuggestedRecipeResponse>(AI_ENDPOINTS.recipe, { prompt, preferences });
}
