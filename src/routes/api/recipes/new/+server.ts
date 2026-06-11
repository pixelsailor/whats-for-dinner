import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { AiParseError, parseRecipeDetail } from '$lib/api/ai/ai.model';
import { appendRecipeDetails } from '$lib/api/ai/ai.server.service';
import { RecipeNewPostBodySchema } from '$lib/api/ai/ai.schemas';

export const POST: RequestHandler = async ({ request, locals }) => {
  const { permissions } = locals;

  const bodyResult = RecipeNewPostBodySchema.safeParse(await request.json());

  if (!bodyResult.success) {
    return json(
      { success: false, data: null, error: 'Invalid request body' },
      { status: 400 }
    );
  }

  const { recipe, preferences } = bodyResult.data;

  const useAiAssistance =
    preferences?.use_ai_assistance && permissions?.ai_assistance;

  if (useAiAssistance) {
    try {
      const raw = await appendRecipeDetails(JSON.stringify(recipe));
      const data = parseRecipeDetail(raw);
      return json({
        success: true,
        data
      });
    } catch (err) {
      if (err instanceof AiParseError) {
        return json(
          { success: false, data: recipe, error: err.message },
          { status: 502 }
        );
      }

      throw err;
    }
  }

  return json({
    success: false,
    data: recipe,
    error: 'AI assistance is not enabled'
  });
};
