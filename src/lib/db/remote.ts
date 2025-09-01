import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { SavedRecipe } from '$lib/types';
import { db } from '$lib/db';

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

export async function syncLocalToRemote(localRecipes: SavedRecipe[], userId: string) {
  for (const recipe of localRecipes) {
    const { error } = await supabase
      .from('recipes')
      .upsert({ ...recipe, owner_id: userId });
    if (error) {
      // Optionally update local recipe with sync_error
      await db.recipes.update(recipe.id, { synced: false, sync_error: error.message });
    } else {
      await db.recipes.update(recipe.id, { synced: true, last_synced_at: Date.now() });
    }
  }
}

export async function syncRemoteToLocal(userId: string) {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('owner_id', userId);

  if (error) throw error;
  if (!data) return;

  for (const recipe of data) {
    await db.recipes.put({ ...recipe, synced: true, last_synced_at: Date.now() });
  }
}

export async function getRecipeFromRemote(id: string) {
	// Try as recipe owner
	const { data, error } = await supabase
		.from('recipes')
		.select('*')
		.eq('id', id)
		.single();

  if (error) throw error;

  return data;
}

export async function getRecipeBySharedId(shared_id:string) {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('shared_id', shared_id)
    .single();

  if (error) throw error;
  return data;
}

// @TODO: A random ID is error prone and no better than the existing random ID used for recipes
// Need to add a user ID to the UUID unless there's going to be some kind of error checking and 
// automatic retry for conflicting IDs. Or use a server function to generate the ID
export async function createSharedRecipe(recipe:SavedRecipe) {
  const shared_id = crypto.randomUUID();
  const { error } = await supabase
    .from('recipes')
    .upsert({ ...recipe, shared_id });
  if (error) throw error;
  return shared_id;
}
