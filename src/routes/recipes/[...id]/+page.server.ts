import { type Actions, fail } from '@sveltejs/kit';
import { OPENAI_DISABLED_ERROR, askCookingQuestion, requestRecipeModifications } from '$lib/server/openai';
import { isModificationRequest, sanitizePromptInput } from '$lib/utils';

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

    const queryFn = isModificationRequest(message) ? requestRecipeModifications : askCookingQuestion;

    try {
      const response = await queryFn(message, recipe);
      if (response && response[1]) {
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
