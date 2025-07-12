import { appendRecipeDetails } from '$lib/server/openai';
import type { FullRecipe } from '$lib/types';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
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
			throw new Error('There was a problem with the server' + `${err}`);
		}
	}
} satisfies Actions;
