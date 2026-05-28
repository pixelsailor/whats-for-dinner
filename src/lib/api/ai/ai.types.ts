import { z } from 'zod';

import type { Recipe } from '$lib/api/recipe';

import type {
  AiSuggestionSchema,
  RecipeAddendumResponseSchema,
  RecipeAssistanceOutputSchema,
  RecipeSuggestionsResponseSchema
} from './ai.schemas';

/**
 * Exported as both a runtime enum-like object and a type-safe union.
 */
export const PromptContextEnum = {
  ADDENDUM: 'addendum',
  ASSISTANCE: 'assistance',
  DETAIL: 'detail',
  REVISION: 'revision',
  SUMMARIES: 'summaries'
} as const;

export type PromptContext = (typeof PromptContextEnum)[keyof typeof PromptContextEnum];

/**
 * Generic API response envelope used by server routes.
 * @template T - payload type
 */
export type ApiResponse<T> = {
  /** Whether the request succeeded. */
  success: boolean;
  /** Payload returned by the API when successful. */
  data: T;
  /** Optional human readable message (errors or success info). */
  message?: string;
  /** Optional structured error object for failures. */
  error?: {
    message: string;
    code?: string;
  };
};

/**
 * Pairing of the originating prompt context with the parsed payload (legacy `/api/recipes`).
 */
export type OpenAiTupleResponse<TPayload> = [PromptContext, TPayload];

/**
 * API payload returned by `/api/recipes` when wrapping OpenAI responses.
 */
export type OpenAiApiResponse<TPayload> = ApiResponse<OpenAiTupleResponse<TPayload>>;

/**
 * Partial enrichment returned by OpenAI when we ask it to append missing recipe metadata.
 */
export type RecipeAddendum = z.infer<typeof RecipeAddendumResponseSchema>;

export type RecipeSuggestion = z.infer<typeof AiSuggestionSchema>;

/** Flat response for `/api/suggestions`. */
export type RecipeSuggestionsResponse = z.infer<typeof RecipeSuggestionsResponseSchema>;

/** Full recipe returned by `/api/suggestions/recipe`. */
export type SuggestedRecipeResponse = Recipe;

/** Response for `/api/recipes` when asking for cooking assistance. */
export type RecipeAssistanceResponse = z.infer<typeof RecipeAssistanceOutputSchema>;

/** Legacy tuple responses for `/api/recipes` and form actions. */
export type LegacyRecipeSuggestionsResponse = OpenAiTupleResponse<RecipeSuggestion[]>;
export type LegacyRecipeDetailResponse = OpenAiTupleResponse<Recipe>;
export type LegacyRecipeRevisionResponse = OpenAiTupleResponse<Recipe>;
export type LegacyRecipeAssistanceResponse = OpenAiTupleResponse<string>;
export type LegacyRecipeAddendumResponse = OpenAiTupleResponse<RecipeAddendum>;
