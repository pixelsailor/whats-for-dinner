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

export const RecipeAddendumSchema = AiSuggestionSchema.extend({
  description: z.string(),
  tags: z.array(z.string()),
  yield: z.string(),
  prep_time: z.string(),
  cook_time: z.string()
});

/**
 * OpenAI response schemas. Responses must have an "object" root.
 *
 * Note: request_id is added by the API layer, not OpenAI. It's used to track
 * prompt requests and prevent duplicate API calls.
 */
export const RecipeSuggestionsResponseSchema = z.object({
  request_id: z.number().describe('Unique timestamp ID for this request, added by API layer'),
  suggestions: z.array(AiSuggestionSchema)
});
export const RecipeDetailResponseSchema = z.object(RecipeSchema);
export const RecipeRevisionResponseSchema = z.object(RecipeSchema);
export const RecipeAssistanceResponseSchema = z.string();
export const RecipeAddendumResponseSchema = z.object(RecipeAddendumSchema);
