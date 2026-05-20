import { type RequestHandler, error, json } from '@sveltejs/kit';

import { AiParseError } from '$lib/api/ai/ai.model';
import { RecipesApiPostBodySchema } from '$lib/api/ai/ai.schemas';
import {
  OPENAI_DISABLED_ERROR,
  appendRecipeDetailsWithContext,
  askCookingQuestionWithContext,
  getFullRecipe,
  getRecipeSuggestions,
  requestRecipeModificationsWithContext
} from '$lib/api/ai/ai.server.service';
import { PromptContextEnum } from '$lib/api/ai/ai.types';
import type {
  LegacyRecipeAddendumResponse,
  LegacyRecipeAssistanceResponse,
  LegacyRecipeDetailResponse,
  LegacyRecipeRevisionResponse,
  LegacyRecipeSuggestionsResponse
} from '$lib/api/ai/ai.types';

type AiResponse =
  | LegacyRecipeAddendumResponse
  | LegacyRecipeAssistanceResponse
  | LegacyRecipeDetailResponse
  | LegacyRecipeRevisionResponse
  | LegacyRecipeSuggestionsResponse;

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const { session, permissions } = locals;

    if (!session) {
      throw error(401, { message: 'Authentication required' });
    }

    const aiAllowed = Boolean(permissions?.ai_assistance);

    if (!aiAllowed) {
      throw error(403, { message: 'AI access denied' });
    }

    const bodyResult = RecipesApiPostBodySchema.safeParse(await request.json());

    if (!bodyResult.success) {
      return error(400, { message: 'A valid prompt and action are required' });
    }

    const { action, prompt, recipe, preferences } = bodyResult.data;

    let response: AiResponse;

    switch (action) {
      case PromptContextEnum.ADDENDUM:
        response = await appendRecipeDetailsWithContext(prompt, preferences);
        break;
      case PromptContextEnum.ASSISTANCE: {
        if (!recipe) {
          return error(400, { message: 'The request is missing a valid recipe string.' });
        }
        response = await askCookingQuestionWithContext(prompt, recipe);
        break;
      }
      case PromptContextEnum.DETAIL: {
        if (!recipe) {
          return error(400, { message: 'The request is missing a short description.' });
        }
        response = await getFullRecipe(prompt, recipe, preferences);
        break;
      }
      case PromptContextEnum.REVISION: {
        if (!recipe) {
          return error(400, { message: 'The request is missing a valid recipe string.' });
        }
        response = await requestRecipeModificationsWithContext(prompt, recipe, preferences);
        break;
      }
      case PromptContextEnum.SUMMARIES:
        response = await getRecipeSuggestions(prompt, preferences || '');
        break;
      default:
        return json({ error: 'Unknown action' }, { status: 400 });
    }

    return json({ success: true, data: response });
  } catch (err) {
    if (err instanceof AiParseError) {
      return json({ error: err.message, code: 'AI_PARSE_ERROR' }, { status: 502 });
    }

    if (err instanceof Error && err.message === OPENAI_DISABLED_ERROR) {
      return json({ error: 'AI service is unavailable right now', code: 'AI_UNAVAILABLE' }, { status: 503 });
    }

    console.error('API Error:', err);
    return json(
      {
        error: err instanceof Error ? err.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
};
