import { getRecipeSuggestions } from '$lib/server/openai';
import { fail, type Actions } from '@sveltejs/kit';

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const message = data.get('input') as string;

		try {
			const response = await getRecipeSuggestions(message.trim());
			return {
				success: true,
				response: JSON.parse(response),
				message
			};
		} catch (error) {
			console.error('Network error:', error);

			return fail(500, {
				error: 'Network error: Unable to connect to the API',
				message
			});
		}
	}
} satisfies Actions;
