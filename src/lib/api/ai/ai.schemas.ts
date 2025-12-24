/**
 * AI Schemas
 * 
 * Contains the schemas for interacting with the OpenAI API.
 */

import { z } from 'zod';
import { RecipeSchema, RecipeSummarySchema } from '../recipe';

/**
 * Generic API response envelope used by server routes.
 * @template T - payload type
 */
export const ApiResponseSchema = z.object({
	/** Whether the request succeeded. */
	success: z.boolean().describe('Whether the request succeeded.'),
	/** Payload returned by the API when successful. */
	data: z.any().describe('The payload returned by the API when successful.'),
	/** Optional human readable message (errors or success info). */
	message: z.string().optional().describe('Optional human readable message (errors or success info).'),
	/** Optional structured error object for failures. */
	error: z.object({
		message: z.string().describe('The error message.'),
		code: z.string().optional().describe('The error code.'),
	}).optional().describe('Optional structured error object for failures.'),
}).describe('Generic API response envelope used by server routes.');

// export const RecipeSuggestionsResponseSchema = z.array(RecipeSummarySchema);

export const RecipeAddendumSchema = z.object({
	short_description: z.string().optional(),
	description: z.string().optional(),
	tags: z.array(z.string()).optional(),
	yield: z.string().optional(),
  prep_time: z.string().optional(),
  cook_time: z.string().optional(),
  total_time: z.string().optional(),
});

export const RecipeSuggestionsResponseSchema = z.array(RecipeSummarySchema);
export const RecipeDetailResponseSchema = z.object(RecipeSchema);
export const RecipeRevisionResponseSchema = z.object(RecipeSchema);
export const RecipeAssistanceResponseSchema = z.string();
export const RecipeAddendumResponseSchema = z.object(RecipeAddendumSchema);