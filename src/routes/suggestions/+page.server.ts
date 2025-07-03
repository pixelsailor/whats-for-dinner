// import { getRecipeSuggestions } from '$lib/server/openai';
// import type { RecipeSummary } from '$lib/types';
// import { sanitizePromptInput } from '$lib/utils';
// import { error } from '@sveltejs/kit';
// import type { PageServerLoad } from './$types';

// export const load: PageServerLoad = async ({ url }) => {
// 	const encodedPrompt = url.searchParams.get('prompt');

// 	// If no prompt value, get suggestion history
// 	if (!encodedPrompt) {
// 		// const suggestions = await db.suggestions.orderBy('created_at').reverse().toArray();
// 		return { suggestions: [] };
// 	}

// 	// Sanitize the prompt value since it can be easily altered in the URL
// 	const message = sanitizePromptInput(decodeURIComponent(encodedPrompt));
// 	const response = await getRecipeSuggestions(message);

// 	if (response) {
// 		return { suggestions: JSON.parse(response) as RecipeSummary[] };
// 	} else {
// 		return error(502, { message: 'The AI failed to produce a valid response.' });
// 	}
// };
