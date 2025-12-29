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
		const response = await generateRecipeSuggestions(prompt, preferences || '');
		const data = JSON.parse(response as string) as RecipeSuggestionsResponse;
		// Don't return an API envelope, just the data. e.g. Don't do json({ success: true, data });
    return json(data);
	} catch (error) {
		console.error('Failed to get recipe suggestions', error);
		return json({ error: (error as Error)?.message || 'Failed to get recipe suggestions' }, { status: 500 });
	}
};
