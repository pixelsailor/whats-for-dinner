import { appendRecipeDetails, OPENAI_DISABLED_ERROR } from '$lib/server/openai';
import type { FullRecipe } from '$lib/types';
import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { session, permissions } = locals;

		if (!session) {
			return fail(401, { error: 'Authentication required' });
		}

		const aiAllowed = Boolean(permissions?.ai_assistance);

		if (!aiAllowed) {
			return fail(403, { error: 'AI access denied' });
		}

		const data = await request.formData();

		const recipe: FullRecipe = {
			title: data.get('title')?.toString().trim() ?? '',
			short_description: data.get('short_description')?.toString().trim() ?? '',
			description: data.get('description')?.toString().trim() ?? '',
			yield: data.get('yield')?.toString().trim() ?? '',
			time: {
				prep: data.get('time_prep')?.toString().trim() ?? '',
				cook: data.get('time_cook')?.toString().trim() ?? '',
				total: ''
			},
			ingredients: data.get('ingredients')?.toString().trim() ?? '',
			instructions: data.get('instructions')?.toString().trim() ?? '',
			notes: data.get('notes')?.toString().trim() ?? '',
			tags: data.get('tags')?.toString().split(',') || []
		};

		try {
			const response = await appendRecipeDetails(JSON.stringify(recipe));
			if (response && response[1]) {
				const [type, message] = response;
				return { type, message };
			}
		} catch (err) {
			if (err instanceof Error && err.message === OPENAI_DISABLED_ERROR) {
				return fail(503, { error: 'AI service is unavailable' });
			}

			return fail(500, { error: 'There was a problem with the server' });
		}
	}
} satisfies Actions;
