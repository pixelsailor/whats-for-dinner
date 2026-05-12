/**
 * Remote Database Models
 *
 * These functions have been deprecated in favor of API Service Layer functions within `src/lib/api/*`.
 * DO NOT use these functions in new code.
 */

import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { SavedRecipe } from '$lib/types';
import { db } from '$lib/db';

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY);

/**
 * Sync local recipes to remote.
 *
 * @deprecated Use `SyncService.uploadRecipes` instead.
 */
export async function syncLocalToRemote(localRecipes: SavedRecipe[], userId: string) {
	for (const recipe of localRecipes) {
		const { error } = await supabase.from('recipes').upsert({ ...recipe, owner_id: userId });
		if (error) {
			// Optionally update local recipe with sync_error
			await db.recipes.update(recipe.id, { synced: false, sync_error: error.message });
		} else {
			await db.recipes.update(recipe.id, { synced: true, last_synced_at: new Date().toISOString() });
		}
	}
}

/**
 * Sync remote recipes to local.
 *
 * @deprecated Use `SyncService.downloadRecipes` instead.
 */
export async function syncRemoteToLocal(userId: string) {
	const { data, error } = await supabase.from('recipes').select('*').eq('owner_id', userId);

	if (error) throw error;
	if (!data) return;

	for (const recipe of data) {
		await db.recipes.put({ ...recipe, synced: true, last_synced_at: new Date().toISOString() });
	}
}

/**
 * Get a recipe from the remote database.
 *
 * @deprecated Use `SyncService.downloadRecipeById` instead.
 */
export async function getRecipeFromRemote(id: string) {
	// Try as recipe owner
	const { data, error } = await supabase.from('recipes').select('*').eq('id', id).single();

	if (error) throw error;

	return data;
}

/**
 * Get a recipe from the remote database by shared id.
 *
 * @deprecated Use `SyncService.downloadRecipeBySharedId` instead.
 */
export async function getRecipeBySharedId(shared_id: string) {
	const { data, error } = await supabase.from('recipes').select('*').eq('shared_id', shared_id).single();

	if (error) throw error;
	return data;
}
