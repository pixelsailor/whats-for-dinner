import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { AiParseError, parseRecipeDetail } from '$lib/api/ai/ai.model';
import { generateRecipe } from '$lib/api/ai/ai.server.service';
import { SuggestedRecipePostBodySchema } from '$lib/api/ai/ai.schemas';

/**
 * Handles requests to generate a recipe based on a prompt.
 *
 * AI assisted modifications should be handled by Page Actions.
 */
export const POST: RequestHandler = async ({ request, locals }): Promise<Response> => {
  const { permissions } = locals;

  const bodyResult = SuggestedRecipePostBodySchema.safeParse(await request.json());

  if (!bodyResult.success) {
    return error(400, { message: 'Prompt is required' });
  }

  const { prompt, preferences } = bodyResult.data;

  const aiAllowed = Boolean(permissions?.ai_assistance);

  if (!aiAllowed) {
    return error(403, { message: 'AI access denied' });
  }

  try {
    const raw = await generateRecipe(prompt, preferences || '');
    const data = parseRecipeDetail(raw);
    return json(data);
  } catch (err) {
    if (err instanceof AiParseError) {
      return json({ error: err.message }, { status: 502 });
    }

    console.error('Failed to get recipe suggestions', err);
    return json({ error: (err as Error)?.message || 'Failed to get recipe suggestions' }, { status: 500 });
  }
};
