import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { type RecipeSuggestionsResponse, generateRecipeSuggestions } from '$lib/api/ai';

type SuggestionsRequest = Request & {
	prompt: string;
	preferences?: string;
};

export const POST: RequestHandler = async ({ request, locals }): Promise<Response> => {
	const { permissions } = locals;

	const { prompt, preferences }: SuggestionsRequest = await request.json();

	if (!prompt) {
		return error(400, { message: 'Prompt is required' });
	}

	const aiAllowed = Boolean(permissions?.ai_assistance);

	if (!aiAllowed) {
		return error(403, { message: 'AI access denied' });
	}

	try {
		// Generate unique request_id for tracking and deduplication
		const request_id = Date.now();
		
		const response = await generateRecipeSuggestions(prompt, preferences || '');
		const parsedData = JSON.parse(response as string);
		
		// Add request_id to the response for client-side tracking
		const data: RecipeSuggestionsResponse = {
			request_id,
			...parsedData
		};
		
		// Don't return an API envelope, just the data. e.g. Don't do json({ success: true, data });
		return json(data);
	} catch (err) {
		console.error('Failed to get recipe suggestions', err);
		return json({ error: (err as Error)?.message || 'Failed to get recipe suggestions' }, { status: 500 });
	}
};
