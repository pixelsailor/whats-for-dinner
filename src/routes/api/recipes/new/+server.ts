import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { appendRecipeDetails } from '$lib/api/ai';
import type { Recipe } from '$lib/api/recipe';

export const POST: RequestHandler = async ({ request, locals }) => {
  const { permissions } = locals;

  const { recipe, preferences } = await request.json();

  const useAiAssistance = preferences?.use_ai_assistance && permissions?.ai_assistance;

  if (useAiAssistance) {
    const response = await appendRecipeDetails(JSON.stringify(recipe));
    return json({
      success: true,
      data: JSON.parse(response as string) as Recipe
    });
  } else {
    return json({
      success: false,
      data: recipe,
      error: 'AI assistance is not enabled'
    });
  }
};
