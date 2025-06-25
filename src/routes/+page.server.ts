import { fail, type Actions } from '@sveltejs/kit';
import { getRecipeSuggestions } from '$lib/server/openai';
import { sanitizePromptInput } from '$lib/utils';

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const message = sanitizePromptInput(data.get('input') as string);

    if (!message) {
      return fail(400, { error: 'A query is required', message });
    }

		try {
			const response = await getRecipeSuggestions(message.trim());
      if (response) {
        return {
          success: true,
          response: JSON.parse(response),
          message
        };
      } else {
        return fail(502, { error: 'Invalid response from AI', message });
      }
			
		} catch (error) {
			console.error('Network error:', error);

			return fail(500, {
				error: 'Network error: Unable to connect to the API',
				message
			});
		}
	}
} satisfies Actions;
