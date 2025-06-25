import { json, type RequestHandler } from '@sveltejs/kit';
import { getFullRecipe, getRecipeSuggestions } from '$lib/server/openai';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { action, ...data } = await request.json();

		let response: string | undefined;

		switch (action) {
			case 'suggestions': {
				response = await getRecipeSuggestions(data.trim());
				break;
			}
			case 'detail': {
				response = await getFullRecipe(data.title);
				break;
			}
			default:
				return json({ error: 'Unknown action' }, { status: 400 });
		}

		if (response) {
			return json({ success: true, data: JSON.parse(response) });
		} else {
			return json({ success: false, error: { message: 'Invalid response from AI', code: 'INVALID_RESPONSE' }}, { status: 502 });
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
