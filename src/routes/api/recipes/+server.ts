import { error, json, type RequestHandler } from '@sveltejs/kit';
import {
	appendRecipeDetails,
	askCookingQuestion,
	getRecipeSuggestions,
	requestRecipeModifications
} from '$lib/server/openai';
import type { PromptContext } from '$lib/types';
import { getFullRecipe } from '$lib/openai/recipe';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const {
			action,
			prompt,
			recipe,
			preferences
		}: { action: PromptContext; prompt: string; recipe?: string; preferences?: string } =
			await request.json();

		if (!prompt || typeof prompt !== 'string') {
			return error(400, { message: 'A valid prompt is required' });
		}

		let response: [PromptContext, string | null];

		switch (action) {
			case 'addendum':
				response = await appendRecipeDetails(prompt);
				break;
			case 'assistance': {
				if (!recipe || typeof recipe !== 'string') {
					return error(400, { message: 'The request is missing a valid recipe string.' });
				}
				response = await askCookingQuestion(prompt, recipe);
				break;
			}
			case 'detail': {
				if (!recipe || typeof recipe !== 'string') {
					return error(400, { message: 'The request is missing a short description.' });
				}
				response = await getFullRecipe(prompt, recipe, preferences);
				break;
			}
			case 'revision': {
				if (!recipe || typeof recipe !== 'string') {
					return error(400, { message: 'The request is missing a valid recipe string.' });
				}
				response = await requestRecipeModifications(prompt, recipe);
				break;
			}
			case 'summaries': {
				response = await getRecipeSuggestions(prompt, preferences || '');
				break;
			}
			default:
				return json({ error: 'Unknown action' }, { status: 400 });
		}

		if (response[1]) {
			return json({ success: true, data: [response[0], JSON.parse(response[1])] });
		} else {
			return json(
				{
					success: false,
					error: { message: 'Invalid response from AI', code: 'INVALID_RESPONSE' }
				},
				{ status: 502 }
			);
		}
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Internal server error'
			},
			{ status: 500 }
		);
	}
};
