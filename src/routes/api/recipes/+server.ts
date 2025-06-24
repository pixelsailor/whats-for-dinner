import { json, type RequestHandler } from '@sveltejs/kit';
import { getFullRecipe } from '$lib/server/openai';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { action, ...data } = await request.json();

		switch (action) {
			case 'detail': {
				const response = await getFullRecipe(data.title);
				return json({ success: true, response });
			}
			default:
				return json({ error: 'Unknown action' }, { status: 400 });
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
