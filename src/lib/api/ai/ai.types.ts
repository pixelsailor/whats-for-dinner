/**
 * @fileoverview Defines inferred contracts for AI routes and Saim conversations.
 * @module lib/api/ai/ai.types
 */

import { z } from 'zod';

import type { Recipe } from '$lib/api/recipe';

import type { ApiResponse } from '$lib/api/common';

import type {
  AiSuggestionSchema,
  AskSaimActionResultSchema,
  AskSaimFormSchema,
  RecipeAddendumResponseSchema,
  RecipeAssistanceOutputSchema,
  RecipeSuggestionsResponseSchema,
  SaimConversationContextSchema
} from './ai.schemas';

export type { ApiResponse };

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

export type PromptContext =
  (typeof PromptContextEnum)[keyof typeof PromptContextEnum];

/**
 * Pairing of the originating prompt context with the parsed payload (legacy `/api/recipes`).
 */
export type OpenAiTupleResponse<TPayload> = [PromptContext, TPayload];

/**
 * API payload returned by `/api/recipes` when wrapping OpenAI responses.
 */
export type OpenAiApiResponse<TPayload> = ApiResponse<
  OpenAiTupleResponse<TPayload>
>;

/**
 * Partial enrichment returned by OpenAI when we ask it to append missing recipe metadata.
 */
export type RecipeAddendum = z.infer<typeof RecipeAddendumResponseSchema>;

export type RecipeSuggestion = z.infer<typeof AiSuggestionSchema>;

/** Flat response for `/api/suggestions`. */
export type RecipeSuggestionsResponse = z.infer<
  typeof RecipeSuggestionsResponseSchema
>;

/** Full recipe returned by `/api/suggestions/recipe`. */
export type SuggestedRecipeResponse = Recipe;

/** Response for `/api/recipes` when asking for cooking assistance. */
export type RecipeAssistanceResponse = z.infer<
  typeof RecipeAssistanceOutputSchema
>;

/** Normalized client fields submitted to the Saim form action. */
export type AskSaimForm = z.infer<typeof AskSaimFormSchema>;

/** Recipe, page, and user identity bound to a Saim conversation. */
export type SaimConversationContext = z.infer<
  typeof SaimConversationContextSchema
>;

/** Successful Saim action response used by the help drawer. */
export type AskSaimActionResult = z.infer<typeof AskSaimActionResultSchema>;

/** Inputs needed to create or continue recipe-scoped cooking assistance. */
export type AskCookingQuestionInput = {
  question: string;
  context: SaimConversationContext;
  conversationId?: string;
  recipeContextChanged?: boolean;
};

/** Provider output plus the Conversation resource that retained the turn. */
export type AskCookingQuestionResult = {
  outputText: string;
  conversationId: string;
};

/** Legacy tuple responses for `/api/recipes` and form actions. */
export type LegacyRecipeSuggestionsResponse = OpenAiTupleResponse<
  RecipeSuggestion[]
>;
export type LegacyRecipeDetailResponse = OpenAiTupleResponse<Recipe>;
export type LegacyRecipeRevisionResponse = OpenAiTupleResponse<Recipe>;
export type LegacyRecipeAssistanceResponse = OpenAiTupleResponse<string>;
export type LegacyRecipeAddendumResponse = OpenAiTupleResponse<RecipeAddendum>;
