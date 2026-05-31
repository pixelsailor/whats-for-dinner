/**
 * @fileoverview Zod contracts for AI routes and OpenAI structured output (`zodTextFormat`).
 * @module lib/api/ai/ai.schemas
 *
 * @remarks Schemas passed to `zodTextFormat` must be plain JSON-shaped object trees (plus
 * `.describe()` on fields where helpful). Avoid `.transform()`, `.pipe()`, and heavy `.refine()` on
 * those schemas—apply normalization in a follow-up parse after structured output succeeds
 * ({@link ../../../../adrs/ADR-007-ai-provider-contract.md ADR-007} structured response contract).
 * Structured output roots use object shapes; properties are required (use `null` instead of optional)
 * where the OpenAI contract requires it.
 */

import { z } from 'zod';

import { RecipeSchema } from '../recipe';

/**
 * OpenAI structured output schema for a recipe suggestion.
 * To conserve API tokens, avoid including fields that are programmatically generated such as uuids or timestamps.
 */
export const AiSuggestionSchema = z.object({
  title: z.string().describe('The title of the recipe.'),
  short_description: z.string().describe('A short, single sentence description of the recipe.')
});

/** Model output for suggestion lists (no API-layer `request_id`). */
export const AiSuggestionsOutputSchema = z.object({
  suggestions: z.array(AiSuggestionSchema)
});

export const RecipeAddendumSchema = AiSuggestionSchema.extend({
  description: z.string(),
  tags: z.array(z.string()),
  yield: z.string(),
  prep_time: z.string(),
  cook_time: z.string()
});

/** Structured output for conversational cooking help. */
export const RecipeAssistanceOutputSchema = z.object({
  answer: z.string().describe('Helpful, conversational cooking advice without altering the recipe.'),
  recipe: RecipeSchema.optional().nullable().describe('The recipe with any modifications made by the user.')
});

/** Full recipe JSON from OpenAI (detail, revision, addendum). */
export const RecipeDetailResponseSchema = RecipeSchema;
export const RecipeRevisionResponseSchema = RecipeSchema;
export const RecipeAddendumResponseSchema = RecipeAddendumSchema;

/**
 * API response for `/api/suggestions` after the handler adds `request_id`.
 */
export const RecipeSuggestionsResponseSchema = z.object({
  request_id: z.number(),
  suggestions: z.array(AiSuggestionSchema)
});

export const SuggestionsPostBodySchema = z
  .object({
    prompt: z.string().min(1),
    preferences: z.string().optional()
  })
  .strict();

export const SuggestedRecipePostBodySchema = z
  .object({
    prompt: z.string().min(1),
    preferences: z.string().optional()
  })
  .strict();

export const RecipesApiPostBodySchema = z
  .object({
    action: z.enum(['addendum', 'assistance', 'detail', 'revision', 'summaries']),
    prompt: z.string().min(1),
    recipe: z.string().optional(),
    preferences: z.string().optional()
  })
  .strict();

export const RecipeNewPostBodySchema = z
  .object({
    recipe: z.unknown(),
    preferences: z
      .object({
        use_ai_assistance: z.boolean().optional()
      })
      .optional()
  })
  .strict();

export const ImportUrlPostBodySchema = z
  .object({
    url: z.string().min(1)
  })
  .strict();
