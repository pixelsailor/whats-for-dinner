import { zodTextFormat } from 'openai/helpers/zod';
import type { PromptContext } from '$lib/types';
import { openai } from '.';
import { RecipeSummarySchema } from './schema';

/**
 * Get recipe suggestions from OpenAI.
 * 
 * @param input - The input to use for the query.
 * @param userPreferences - The user preferences to use for the query.
 * @returns The recipe suggestions.
 * @deprecated
 * @see $lib/queries/recipes.ts
 */
export async function getRecipeSuggestions(
	input: string,
	userPreferences: string
): Promise<[PromptContext, string | null]> {
	const systemPrompt = `
You are a helpful meal planning assistant. The user will provide a request, which could be about 
meal recipes or a more specific, non-meal recipe (e.g., spice blends, sauces, beverages, condiments).
Considering cuisine, dietary needs, ingredients, etc., respond with a JSON array of 4-8 recipe ideas.
${userPreferences}

Each item should include:
- title (string)
- short_description (string)

DO NOT include anything outside of the JSON response.
`;
	try {
		const response = await openai.responses.parse({
			model: 'gpt-5-nano',
			input: [
				{
					role: 'system',
					content: systemPrompt
				},
				{
					role: 'user',
					content: input
				}
			],
			text: {
        format: zodTextFormat(RecipeSummarySchema, 'summary')
      }
		});

    console.log(response);
    
		return ['summaries', response.output_text ?? null];
	} catch (error) {
		console.error('OpenAI API error:', error);
		throw error;
	}
}
