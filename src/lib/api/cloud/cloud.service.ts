import { SupabaseClient } from '@supabase/supabase-js';
import randomBytes from '$lib/utils/randombytes';

import type { SavedRecipe } from '../recipe/recipe.types';

type AugmentedSavedRecipe = SavedRecipe & {
  last_synced_at: string;
};

/**
 * Cloud Service
 * 
 * Handles cloud backup and synchronization of recipes and shared recipes.
 * Cloud Services are only available to authorized users with the `cloud_storage` permission.
 * 
 * Any time a recipe is uploaded or downloaded, the `last_synced_at` timestamp must be updated.
 * 
 * Responsibility: remote-only Supabase interactions (recipes, archives, shared links).
 * Dexie/local persistence must be orchestrated by a higher-level sync layer.
 * 
 * @example
 * ```typescript
 * // +page.server.ts
 * import { CloudService } from '$lib/api/cloud/cloud.service';
 *
 * export const load: PageServerLoad = async ({ locals: { supabase, permissions, safeGetSession } }) => {
 *   const { user } = await safeGetSession();
 *   if (!user || !permissions?.cloud_storage) {
 *     return { error: 'Unauthorized' };
 *   }
 *   const cloudService = new CloudService(supabase, user.id);
 *   return { cloudService };
 * };
 * ```
 * 
 * **A note about deleted recipes:**
 * Because deleted recipes are put into a recoverable state after they're "deleted", they must be
 * included in the sync process to ensure they are available locally for recovery. They should not
 * be included in _suggested_, _recommended_, or active recipe lists.
 */
export class CloudService {
  private supabase: SupabaseClient;

  private _userId: string;

  constructor(supabase: SupabaseClient, userId: string) {
    this.supabase = supabase;
    this._userId = userId;
  }

  /**
   * Get all the user's recipes in a summary format for comparison during sync.
   * 
   * @returns The recipe summaries.
   */
  async getAllRecipeSummaries(): Promise<AugmentedSavedRecipe[]> {
    const { data, error }: { data: Partial<SavedRecipe>[] | null; error: Error | null } = await this.supabase
      .from('recipes')
      .select('title, short_description, id, last_synced_at')
      .eq('owner_id', this._userId)
      .is('archived', null);

    if (error) throw error;

    return data as AugmentedSavedRecipe[] ?? [];
  }

  /**
   * Create a shared recipe link for a recipe.
   * 
   * @param recipe - The recipe to create a shared link for.
   * @returns The shared link.
   */
  async createSharedRecipeUrl(recipe: SavedRecipe, expiresAt?: string): Promise<{ token: string; url: string }> {
    if (recipe.shared_id) {
      return { token: recipe.shared_id, url: `/share/${recipe.shared_id}` };
    }

    // Generate a short token (Base58, 10 chars)
    const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const token = Array.from(randomBytes(8))
      .map(b => alphabet[b % alphabet.length])
      .join('');

    const { error } = await this.supabase
      .from('shared_links')
      .insert({
        token,
        recipe_id: recipe.id,
        user_id: recipe.owner_id,
        expires_at: expiresAt ? expiresAt : null
      })
      .select();

    if (error) throw error;

    return { token, url: `/share/${token}` };
  }

  /**
   * Delete a shared recipe link for a recipe.
   * 
   * Setting the `shared_id` to `null` will delete the `shared_links` record.
   * 
   * @param token - The token of the shared recipe link to delete.
   */
  async deleteSharedRecipeUrl(token: string): Promise<void> {
    const { error } = await this.supabase
      .from('recipes')
      .update({ shared_id: null })
      .eq('shared_id', token);

    if (error) throw error;
  }

  /**
   * Get all archived recipes for the user.
   * 
   * @returns The archived recipes.
   */
  async getArchivedRecipes(): Promise<SavedRecipe[] | null> {
    const { data, error }: { data: SavedRecipe[] | null; error: Error | null } = await this.supabase
      .from('recipes')
      .select('*')
      .eq('owner_id', this._userId)
      .not('archived','is', null);

    if (error) throw error;

    return data;
  }

  /**
   * Download an archived recipe from the cloud.
   * 
   * @param recipeId - The id of the recipe to download.
   * @returns The recipe.
   */
  async downloadArchivedRecipe(recipeId: string): Promise<SavedRecipe | null> {
    const { data, error }: { data: SavedRecipe | null; error: Error | null } = await this.supabase
      .from('recipes')
      .select('*')
      .eq('owner_id', this._userId)
      .eq('id', recipeId)
      .single();

    if (error) throw error;

    return data;
  }

  /**
   * Upload a local recipe to the cloud.
   * 
   * Supabase will automatically update the `last_synced_at` timestamp.
   * 
   * @param recipe - The recipe to sync.
   */
  async uploadLocalRecipe(recipe: SavedRecipe): Promise<SavedRecipe | null> {
    const { data, error } = await this.supabase
      .from('recipes')
      .upsert(recipe)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  /**
   * Upload all local recipes to the cloud.
   * 
   * @param recipes - The recipes to sync.
   */
  async uploadAllLocalRecipes(recipes: SavedRecipe[]): Promise<SavedRecipe[] | null> {
    const { data, error } = await this.supabase
      .from('recipes')
      .upsert(recipes)
      .select();

    if (error) throw error;

    return data;
  }

  /**
   * Download all cloud recipes to local storage.
   * 
   * @returns The synced recipes or null if there was an error.
   */
  async downloadAllRemoteRecipes(): Promise<SavedRecipe[] | null> {
    const { data, error }: { data: SavedRecipe[] | null; error: Error | null } = await this.supabase
      .from('recipes')
      .select('*')
      .eq('owner_id', this._userId)
      .is('archived', null);

    if (error) throw error;

    return data;
  }

  /**
   * Download a single active recipe from the cloud.
   *
   * @param recipeId - The id of the recipe to download.
   * @returns The recipe or null if not found.
   */
  async downloadRecipeById(recipeId: string): Promise<SavedRecipe | null> {
    const { data, error }: { data: SavedRecipe | null; error: Error | null } = await this.supabase
      .from('recipes')
      .select('*')
      .eq('owner_id', this._userId)
      .eq('id', recipeId)
      .single();

    if (error) throw error;

    return data;
  }

  /**
   * Get all deleted recipes for the user.
   * 
   * A deleted recipe is a recipe that has been deleted from the local database. When a recipe is 
   * deleted, it gets flagged with a `deleted_at` timestamp and is no longer considered active.
   * Deleted recipes can be recovered before their expiry date.
   * 
   * @returns The deleted recipes.
   */
  async getDeletedRecipes(): Promise<SavedRecipe[] | null> {
    const { data, error }: { data: SavedRecipe[] | null; error: Error | null } = await this.supabase
      .from('recipes')
      .select('*')
      .eq('owner_id', this._userId)
      .not('deleted_at', 'is', null);

    if (error) throw error;

    return data;
  }

  /**
   * Permanently delete a deleted recipe from the cloud.
   * 
   * This action is irreversible and will permanently delete the recipe from the cloud. It should
   * only be called after the recipe has exceeded its expiry date.
   * 
   * @param recipeId - The id of the recipe to delete.
   */
  async deletedRecipe(recipeId: string): Promise<void> {
    const { error } = await this.supabase
      .from('recipes')
      .delete()
      .eq('id', recipeId)
      .eq('owner_id', this._userId);

    if (error) throw error;
  }
}
