// import type { Actions } from './$types';

// import { OPENAI_DISABLED_ERROR, appendRecipeDetails } from '$lib/api/ai';
// import type { Recipe, SavedRecipe } from '$lib/api/recipe';
// import { CloudService } from '$lib/api/cloud';
// import { json, redirect } from '@sveltejs/kit';

// function convertTimeToMinutes(hours: string, minutes: string): string {
//   const hoursInt = parseInt(hours.trim());
//   const minutesInt = parseInt(minutes.trim());
//   const time = hoursInt * 60 + minutesInt;
//   return time.toString();
// }

// function createSavedRecipe(recipe: Recipe, error?: string | null, userId: string | null = null): SavedRecipe {
//   const now = new Date().toISOString();
//   return {
//     ...recipe,
//     synced: false,
//     sync_error: error ?? null,
//     id: crypto.randomUUID(),
//     created_at: now,
//     updated_at: now,
//     archived: null,
//     deleted_at: null,
//     last_opened: now,
//     version: 1,
//     checkout_history: [],
//     is_current: true,
//     is_favorite: false,
//     owner_id: userId ?? null,
//     shared_id: null,
//     last_synced_at: null,
//     parent_id: null,
//   };
// }

// export const actions: Actions = {
//   /**
//    * Check the user session and permissions.
//    * If the user is not logged they should be notified the recipe was only saved locally
//    * If the user is logged and does not have cloud storage permission they should be notified the recipe was only saved locally
//    * If the user is logged and does not have AI assistance permission they should be able to save the recipe without AI assistance
//    * If the user is logged and has AI assistance permission they should be able to save the recipe with AI assistance
//    */
// 	default: async ({ request, locals }) => {
// 		const { session, permissions } = locals;

//     let cloudService: CloudService | undefined = undefined;

//     if (session && permissions?.cloud_storage && locals.user?.id) {
//       cloudService = new CloudService(locals.supabase, locals.user?.id);
//     }

//     const data = await request.formData();

//     const hasEmptyFields = Object.values(data).some(value => value === '' || value === null || value === undefined);

//     const prepTime: string[] = [convertTimeToMinutes(data.get('prep_time_hours')?.toString().trim() ?? '0', data.get('prep_time_minutes')?.toString().trim() ?? '0')];
//     const cookTime: string[] = [convertTimeToMinutes(data.get('cook_time_hours')?.toString().trim() ?? '0', data.get('cook_time_minutes')?.toString().trim() ?? '0')];

//     let recipe: Recipe = {
//       title: data.get('title')?.toString().trim() ?? '',
//       short_description: data.get('short_description')?.toString().trim() ?? '',
//       description: data.get('description')?.toString().trim() ?? '',
//       ingredients: data.get('ingredients')?.toString().trim() ?? '',
//       instructions: data.get('instructions')?.toString().trim() ?? '',
//       tags: data.get('tags')?.toString().split(',') || [],
//       yield: data.get('yields')?.toString().trim() ?? '',
//       prep_time: prepTime,
//       cook_time: cookTime,
//       notes: data.get('notes')?.toString().trim() ?? '',
//     };

// 		const aiAllowed = Boolean(permissions?.ai_assistance);

//     // Allow AI assistance to be used to fill in missing fields
//     if (aiAllowed && hasEmptyFields) {
//       try {
//         // const [_, response] = await appendRecipeDetails(JSON.stringify(recipe));
//         const response = await appendRecipeDetails(JSON.stringify(recipe));
//         recipe = JSON.parse(response as string) as Recipe;
//       } catch (err) {
//         console.error('Failed to append recipe details', err);
//       }
//     }

//     let candidate: SavedRecipe | null = null;

//     if (cloudService) {
//       // Attempt to upload the recipe to the cloud and sync the local database
//       try {
//         console.log('uploading recipe to cloud', recipe);
//         candidate = await cloudService.uploadLocalRecipe(recipe);
//         await db.recipes.add(candidate);
//         return json({
//           success: true,
//           data: candidate,
//         });
//         // redirect(302, `/recipes/${candidate.id}`);
//       } catch (err) {
//         // If the upload fails, create a local recipe and save to the local database
//         console.error('Failed to upload recipe to cloud', err);
//         candidate = createSavedRecipe(recipe, err instanceof Error ? err.message : 'Unknown error', locals.user?.id);
//         await db.recipes.add(candidate);
//         return json({
//           success: false,
//           data: candidate,
//           error: err instanceof Error ? err.message : 'Unknown error',
//         });
//       }
//     } else {
//       // If cloud storage is not available, create a local recipe and save to the local database
//       candidate = createSavedRecipe(recipe, null, locals.user?.id);
//       await db.recipes.add(candidate);
//       // redirect(302, `/recipes/${candidate.id}`);
//       return json({
//         success: true,
//         data: candidate,
//       });
//     }
// 	}
// } satisfies Actions;
