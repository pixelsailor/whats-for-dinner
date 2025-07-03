import { error, json, type RequestHandler } from '@sveltejs/kit';
import { askCookingQuestion, getFullRecipe, getRecipeSuggestions } from '$lib/server/openai';
import type { promptContext } from '$lib/queries/recipes';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { action, prompt, recipe }: { action: promptContext; prompt: string; recipe?: string } =
			await request.json();

		if (!prompt || typeof prompt !== 'string') {
			return error(400, { message: 'A valid prompt is required' });
		}

		let response: [promptContext, string | null];

		switch (action) {
			case 'summaries': {
				response = await getRecipeSuggestions(prompt.trim());
				break;
			}
			case 'assistance': {
				if (!recipe || typeof recipe !== 'string') {
					return error(400, { message: 'The request is missing a valid recipe string.' });
				}

				response = await askCookingQuestion(prompt, recipe);
				break;
			}
			case 'detail': {
				response = await getFullRecipe(prompt);
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
