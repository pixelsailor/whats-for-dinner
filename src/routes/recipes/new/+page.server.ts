import type { Actions } from './$types';
import { v4 as uuid } from 'uuid';

import { OPENAI_DISABLED_ERROR, appendRecipeDetails } from '$lib/api/ai';
import type { Recipe, SavedRecipe } from '$lib/api/recipe';
import { CloudService } from '$lib/api/cloud';

/**
 * Manually update the recipe data with required properties for local storage
 * 
 * @param recipe - The recipe to update.
 * @param error - The error message if the recipe could not be saved to the cloud.
 * @returns The updated recipe.
 */
function prepLocalRecipeData(recipe: Recipe | SavedRecipe, error?: string): SavedRecipe {
  const now = new Date();
  const newRecipe: SavedRecipe = {
    ...recipe,
    id: uuid(),
    created_at: now.toISOString(),
    last_opened: now.toISOString(),
    version: 1,
    is_current: true,
    is_favorite: false,
    synced: false,
    sync_error: error ?? undefined,
  };
  return newRecipe;
};

function convertTimeToMinutes(hours: string, minutes: string): string {
  const hoursInt = parseInt(hours.trim());
  const minutesInt = parseInt(minutes.trim());
  const time = hoursInt * 60 + minutesInt;
  return time.toString();
}

export const actions: Actions = {
  /**
   * Check the user session and permissions.
   * If the user is not logged they should be notified the recipe was only saved locally
   * If the user is logged and does not have cloud storage permission they should be notified the recipe was only saved locally
   * If the user is logged and does not have AI assistance permission they should be able to save the recipe without AI assistance
   * If the user is logged and has AI assistance permission they should be able to save the recipe with AI assistance
   */
	default: async ({ request, locals }) => {
		const { session, permissions } = locals;

    const data = await request.formData();

    const prepTime: string[] = [convertTimeToMinutes(data.get('prep_time_hours')?.toString().trim() ?? '0', data.get('prep_time_minutes')?.toString().trim() ?? '0')];
    const cookTime: string[] = [convertTimeToMinutes(data.get('cook_time_hours')?.toString().trim() ?? '0', data.get('cook_time_minutes')?.toString().trim() ?? '0')];

    // Initialize the recipe data with the default values -- assumes cloud storage is available
    let recipe: Recipe | SavedRecipe = {
			title: data.get('title')?.toString().trim() ?? '',
			short_description: data.get('short_description')?.toString().trim() ?? '',
			description: data.get('description')?.toString().trim() ?? '',
			yield: data.get('yield')?.toString().trim() ?? '',
      prep_time: prepTime,
      cook_time: cookTime,  
			ingredients: data.get('ingredients')?.toString().trim() ?? '',
			instructions: data.get('instructions')?.toString().trim() ?? '',
			notes: data.get('notes')?.toString().trim() ?? '',
			tags: data.get('tags')?.toString().split(',') || [],
      is_current: true,
      is_favorite: false,
      version: 1,
      synced: true,
      sync_error: undefined,
		};

		const aiAllowed = Boolean(permissions?.ai_assistance);

    // Allow AI assistance to be used to fill in missing fields
    if (aiAllowed) {
      try {
        const [_, response] = await appendRecipeDetails(JSON.stringify(recipe));
        console.log('response', response);
        recipe = response as Recipe;
      } catch (err) {
        if (err instanceof Error && err.message === OPENAI_DISABLED_ERROR) {
          // TODO: This shouldn't block the recipe from being saved; it should be a warning to the user that AI is disabled
          // return fail(503, { error: 'AI service is unavailable' });
        }
      }
    } else {
      console.log('AI is not allowed');
    }

    let savedRecipe: SavedRecipe | null = null;

    if (session && permissions?.cloud_storage && locals.user?.id) {
      // Save the recipe to the cloud
      const cloudService = new CloudService(locals.supabase, locals.user?.id);
      try {
        savedRecipe = await cloudService.uploadLocalRecipe(recipe);
      } catch (err) {
        console.error('err', err);
        // TODO: This shouldn't block the recipe from being saved; it should be a warning to the user that the recipe could not be saved to the cloud
        // return fail(500, { error: 'There was a problem saving the recipe' });

        // In the event of an error, prep for local storage by updating remaining properties
        savedRecipe = prepLocalRecipeData(recipe, err instanceof Error ? err.message : 'Unknown error');
      }
    } else {
      console.log('Cloud storage is not allowed');
      
      // If cloud storage is unavailable, prep for local storage by updating remaining properties
      savedRecipe = prepLocalRecipeData(recipe);
    }

    return savedRecipe;
	}
} satisfies Actions;
