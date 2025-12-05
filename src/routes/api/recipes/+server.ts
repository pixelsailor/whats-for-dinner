import { error, json, type RequestHandler } from '@sveltejs/kit';
import {
	appendRecipeDetails,
	askCookingQuestion,
	getRecipeSuggestions,
	requestRecipeModifications,
	getFullRecipe,
	OPENAI_DISABLED_ERROR
} from '$lib/server/openai';
import type {
	PromptContext,
	RecipeAddendumResponse,
	RecipeAssistanceResponse,
	RecipeDetailResponse,
	RecipeRevisionResponse,
	RecipeSuggestionsResponse
} from '$lib/types';
import { checkPolicy } from '$lib/utils/permissions';
// import { getRecipeSuggestions } from '$lib/openai/suggestions';

type AiResponse =
	| RecipeAddendumResponse
	| RecipeAssistanceResponse
	| RecipeDetailResponse
	| RecipeRevisionResponse
	| RecipeSuggestionsResponse;

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const session = locals.session;

		if (!session) {
			throw error(401, { message: 'Authentication required' });
		}

		const aiPolicy = checkPolicy(session, 'ai_assistance');

		if (!aiPolicy.allowed) {
			throw error(403, { message: aiPolicy.reason ?? 'AI access denied' });
		}

		const {
			action,
			prompt,
			recipe,
			preferences
		}: { action: PromptContext; prompt: string; recipe?: string; preferences?: string } =
			await request.json();

		if (!prompt || typeof prompt !== 'string') {
			return error(400, { message: 'A valid prompt is required' });
		}

		let response: AiResponse;

		switch (action) {
			case 'addendum':
				response = await appendRecipeDetails(prompt);
				break;
			case 'assistance': {
				if (!recipe || typeof recipe !== 'string') {
					return error(400, { message: 'The request is missing a valid recipe string.' });
				}
				response = await askCookingQuestion(prompt, recipe);
				break;
			}
			case 'detail': {
				if (!recipe || typeof recipe !== 'string') {
					return error(400, { message: 'The request is missing a short description.' });
				}
				response = await getFullRecipe(prompt, recipe, preferences);
				break;
			}
			case 'revision': {
				if (!recipe || typeof recipe !== 'string') {
					return error(400, { message: 'The request is missing a valid recipe string.' });
				}
				response = await requestRecipeModifications(prompt, recipe);
				break;
			}
			case 'summaries': {
				response = await getRecipeSuggestions(prompt, preferences || '');
				break;
			}
			default:
				return json({ error: 'Unknown action' }, { status: 400 });
		}

		return json({ success: true, data: response });
	} catch (error) {
		if (error instanceof Error && error.message === OPENAI_DISABLED_ERROR) {
			return json(
				{ error: 'AI service is unavailable right now', code: 'AI_UNAVAILABLE' },
				{ status: 503 }
			);
		}

		console.error('API Error:', error);
		return json(
			{
				error: error instanceof Error ? error.message : 'Internal server error'
			},
			{ status: 500 }
		);
	}
};
