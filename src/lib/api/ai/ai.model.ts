/**
 * @fileoverview Pure parsers and helpers for AI provider JSON; no network or secrets.
 * @module lib/api/ai/ai.model
 */

import { z } from 'zod';

import type { Recipe } from '$lib/api/recipe';

import {
  AiSuggestionsOutputSchema,
  RecipeAddendumResponseSchema,
  RecipeAssistanceOutputSchema,
  RecipeDetailResponseSchema,
  RecipeSuggestionsResponseSchema
} from './ai.schemas';
import type { RecipeAddendum, RecipeSuggestionsResponse } from './ai.types';

/** Thrown when provider output is not valid JSON or fails Zod validation. */
export class AiParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiParseError';
  }
}

/**
 * Parses a JSON string and validates it with the given schema.
 * @param raw - Provider `output_text` or other JSON string
 * @param schema - Zod schema for the expected payload
 * @param context - Label for logs and error messages
 * @returns Validated payload
 * @throws {AiParseError} When JSON is invalid or validation fails
 */
export function parseStructuredOutput<T>(
  raw: string,
  schema: z.ZodType<T>,
  context: string
): T {
  let json: unknown;

  try {
    json = JSON.parse(raw);
  } catch (error) {
    console.error(`Failed to parse AI JSON for "${context}".`, { raw, error });
    throw new AiParseError(`Failed to parse AI JSON for "${context}".`);
  }

  const result = schema.safeParse(json);

  if (!result.success) {
    console.error(
      `AI output validation failed for "${context}".`,
      result.error.flatten()
    );
    throw new AiParseError(`AI output failed validation for "${context}".`);
  }

  return result.data;
}

/**
 * Validates OpenAI suggestion list output (without `request_id`).
 * @param raw - Provider `output_text`
 */
export function parseSuggestionsOutput(
  raw: string
): z.infer<typeof AiSuggestionsOutputSchema> {
  return parseStructuredOutput(raw, AiSuggestionsOutputSchema, 'suggestions');
}

/**
 * Merges API-layer `request_id` into a validated suggestions payload.
 * @param output - Validated model output
 * @param requestId - Timestamp id assigned by the route handler
 */
export function buildSuggestionsResponse(
  output: z.infer<typeof AiSuggestionsOutputSchema>,
  requestId: number
): RecipeSuggestionsResponse {
  const merged = { request_id: requestId, ...output };
  const result = RecipeSuggestionsResponseSchema.safeParse(merged);

  if (!result.success) {
    throw new AiParseError('Failed to assemble suggestions API response.');
  }

  return result.data;
}

/**
 * Validates a full recipe payload from OpenAI.
 * @param raw - Provider `output_text`
 */
export function parseRecipeDetail(raw: string): Recipe {
  return parseStructuredOutput(
    raw,
    RecipeDetailResponseSchema,
    'recipe detail'
  );
}

/**
 * Validates recipe revision output.
 * @param raw - Provider `output_text`
 */
export function parseRecipeRevision(raw: string): Recipe {
  return parseStructuredOutput(
    raw,
    RecipeDetailResponseSchema,
    'recipe revision'
  );
}

/**
 * Validates addendum / metadata enrichment output.
 * @param raw - Provider `output_text`
 */
export function parseRecipeAddendum(raw: string): RecipeAddendum {
  return parseStructuredOutput(
    raw,
    RecipeAddendumResponseSchema,
    'recipe addendum'
  );
}

/**
 * Validates conversational assistance output and returns the answer text.
 * @param raw - Provider `output_text`
 */
export function parseAssistanceAnswer(raw: string): string {
  const parsed = parseStructuredOutput(
    raw,
    RecipeAssistanceOutputSchema,
    'recipe assistance'
  );
  return parsed.answer;
}

/**
 * Strips risky characters and caps length before sending user text to AI routes.
 * @param input - Raw user prompt or preference text
 * @returns Sanitized string suitable for provider input
 */
export function sanitizePromptInput(input: string): string {
  return input
    .replace(/[<>`$]/g, '')
    .trim()
    .slice(0, 500);
}

/**
 * Heuristic for general cooking Q&A prompts.
 * @param input - User message
 * @deprecated Modification detection is now handled by the AI service; see `askCookingQuestion`.
 */
export function isGeneralCookingQuestion(input: string): boolean {
  const keywords = [
    'how do I',
    'what happens if',
    'can I use',
    "what's the best",
    'how long should',
    'should I',
    'what is',
    'is it okay to',
    'why does'
  ];

  const lowered = input.toLowerCase().trim();
  return keywords.some((k) => lowered.startsWith(k) || lowered.includes(k));
}

/**
 * Heuristic for recipe modification prompts.
 * @param input - User message
 * @deprecated Modification detection is now handled by the AI service; see `askCookingQuestion`.
 */
export function isModificationRequest(input: string): boolean {
  const keywords = [
    'update',
    'change',
    'replace',
    'add',
    'remove',
    'increase',
    'decrease',
    'reduce',
    'take out',
    'swap',
    'substitute',
    'use',
    'alter',
    'convert to',
    'adjust',
    'omit',
    'make this',
    'make it',
    'modify',
    'double',
    'triple',
    'halve',
    'cut it',
    'cut this',
    'cut the',
    'split',
    'turn this into',
    'transform'
  ];

  const lowered = input.toLowerCase().trim();
  return keywords.some((k) => lowered.startsWith(k));
}
