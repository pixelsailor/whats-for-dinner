import {
	askCookingQuestion,
	requestRecipeModifications,
	OPENAI_DISABLED_ERROR
} from '$lib/server/openai';
import { isModificationRequest, sanitizePromptInput } from '$lib/utils';
import { error, fail, type Actions, type ServerLoad } from '@sveltejs/kit';
import { checkPolicy } from '$lib/utils/permissions';

export const load: ServerLoad = async ({ url }) => {
  const encodedTitle = url.searchParams.get('title');
  const encodedDesc = url.searchParams.get('desc');
	
	if (!encodedTitle) error(404, 'No title provided');

	return { recipeTitle: encodedTitle, desc: encodedDesc || 'no description given' };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const session = locals.session;

		if (!session) {
			return fail(401, { error: 'Authentication required' });
		}

		const aiPolicy = checkPolicy(session, 'ai-assisted-recipe');

		if (!aiPolicy.allowed) {
			return fail(403, { error: aiPolicy.reason ?? 'AI access denied' });
		}

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
			if (response && response[1] != null) {
				const [type, message] = response;
				return { type, message };
			} else {
				return fail(502, { error: 'Invalid response from AI', message });
			}
		} catch (error) {
			if (error instanceof Error && error.message === OPENAI_DISABLED_ERROR) {
				return fail(503, {
					error: 'AI service is unavailable right now',
					message
				});
			}

			console.error('Network error:', error);

			return fail(500, {
				error: 'Network error: Unable to connect to the API',
				message
			});
		}
	}
} satisfies Actions;
