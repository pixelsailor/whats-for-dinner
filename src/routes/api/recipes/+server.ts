import { json, type RequestHandler } from '@sveltejs/kit';
import { getFullRecipe, getRecipeSuggestions } from '$lib/server/openai';

export const POST: RequestHandler = async ({ request }) => {
	console.log('+server POST');
	try {
		const { action, ...data } = await request.json();

		let response;

		console.log(action, data);

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
		return json({ success: true, data: JSON.parse(response) });
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
