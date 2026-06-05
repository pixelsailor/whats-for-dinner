import { type Actions, fail } from '@sveltejs/kit';
import {
  OPENAI_DISABLED_ERROR,
  OPENAI_INVALID_KEY_FORMAT_ERROR,
  askCookingQuestion
} from '$lib/api/ai/ai.server.service';
import { AiParseError } from '$lib/api/ai/ai.model';
import { sanitizePromptInput } from '$lib/api/ai/ai.model';

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
    const message = sanitizePromptInput(data.get('input') as string);
    const recipe = data.get('recipe') as string;

    if (!message) {
      return fail(400, { error: 'A query is required', message });
    }
    if (!recipe) {
      return fail(400, { error: 'The recipe was not provided.' });
    }

    try {
      const response = await askCookingQuestion(message, recipe);
      return { message: response };
    } catch (error) {
      if (error instanceof AiParseError) {
        return fail(502, { error: error.message, message });
      }

      if (error instanceof Error && error.message === OPENAI_DISABLED_ERROR) {
        return fail(503, {
          error: 'AI service is unavailable right now',
          message
        });
      }
      if (error instanceof Error && error.message === OPENAI_INVALID_KEY_FORMAT_ERROR) {
        return fail(503, {
          error: 'AI service configuration is invalid right now',
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
