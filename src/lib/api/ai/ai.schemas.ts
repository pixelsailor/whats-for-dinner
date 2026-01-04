/**
 * AI Schemas
 * 
 * Contains the schemas for interacting with the OpenAI API. Schemas used for OpenAI structured
 * output responses must have an "object" root and properties must be required: Must not be optional
 * but can be null.
 */

import { z } from 'zod';
import { RecipeSchema } from '../recipe';

/**
 * OpenAI structured output schema for a recipe suggestion.
 * To conserve API tokens, avoid including fields that are programmatically generated such as uuids or timestamps.
 */
export const AiSuggestionSchema = z.object({
	title: z.string().describe('The title of the recipe.'),
	short_description: z.string().describe('A short, single sentence description of the recipe.'),
});

export const RecipeAddendumSchema = AiSuggestionSchema.extend({
	description: z.string(),
	tags: z.array(z.string()),
	yield: z.string(),
  prep_time: z.string(),
  cook_time: z.string(),
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