import { z } from 'zod';
import type {
	AiSuggestionSchema,
	RecipeAddendumResponseSchema,
	RecipeDetailResponseSchema,
	RecipeRevisionResponseSchema,
	RecipeSuggestionsResponseSchema,
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
 * Pairing of the originating prompt context with the parsed payload coming back from OpenAI.
 */
export type OpenAiResponse<TPayload> = TPayload;

/**
 * API payload returned by `/api/recipes` when wrapping OpenAI responses.
 */
export type OpenAiApiResponse<TPayload> = ApiResponse<OpenAiResponse<TPayload>>;

/**
 * Partial enrichment returned by OpenAI when we ask it to append missing recipe metadata.
 */
export type RecipeAddendum = {
	short_description?: string;
	description?: string;
	tags?: string[];
	yield?: string;
	prep_time?: string;
	cook_time?: string;
};

export type RecipeSuggestion = z.infer<typeof AiSuggestionSchema>;
export type RecipeSuggestionsResponse = z.infer<typeof RecipeSuggestionsResponseSchema>;
export type RecipeDetailResponse = z.infer<typeof RecipeDetailResponseSchema>;
export type RecipeRevisionResponse = z.infer<typeof RecipeRevisionResponseSchema>;
export type RecipeAssistanceResponse = OpenAiResponse<string>;
export type RecipeAddendumResponse = z.infer<typeof RecipeAddendumResponseSchema>;
