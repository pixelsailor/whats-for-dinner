import { askCookingQuestion, getFullRecipe, requestRecipeModifications } from '$lib/server/openai';
import { getCachedRecipe, setCachedRecipe } from '$lib/stores/recipes';
import type { FullRecipe } from '$lib/types';
import { isModificationRequest, sanitizePromptInput } from '$lib/utils';
import { error, fail, type Actions, type ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async ({ url }): Promise<FullRecipe> => {
  
  const encodedTitle = url.searchParams.get('title');
	if (!encodedTitle) error(404, 'No title provided');
  
	const title = decodeURIComponent(encodedTitle);

	// Check session for cached recipe data
	// const cachedRecipe = getCachedRecipe(title);
	// if (cachedRecipe) {
	// 	return JSON.parse(cachedRecipe);
	// }

	// Make API call using decoded searchParams
	const response = await getFullRecipe(sanitizePromptInput(title));

	if (response) {
		// setCachedRecipe(title, response); // cache the response
		return JSON.parse(response) as FullRecipe;
	} else {
		error(500, { message: 'The AI failed to produce a response.' });
	}
};

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const message = sanitizePromptInput(data.get('input') as string);
		const recipe = data.get('recipe') as string;

		if (!message) {
			return fail(400, { error: 'A query is required', message });
		}
		if (!recipe) {
			return fail(400, { error: `The recipe was not provided.` });
		}

		const queryFn = isModificationRequest(message)
			? requestRecipeModifications
			: askCookingQuestion;

		try {
			const response = await queryFn(message.trim(), recipe);
			if (response) {
				const [type, message] = response;
				return { type, message };
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
