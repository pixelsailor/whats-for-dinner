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
 */
export const RecipeSuggestionsResponseSchema = z.object({
	suggestions: z.array(AiSuggestionSchema)
});
export const RecipeDetailResponseSchema = z.object(RecipeSchema);
export const RecipeRevisionResponseSchema = z.object(RecipeSchema);
export const RecipeAssistanceResponseSchema = z.string();
export const RecipeAddendumResponseSchema = z.object(RecipeAddendumSchema);