import { SupabaseClient } from '@supabase/supabase-js';
import randomBytes from 'randombytes';

import type { SavedRecipe } from '../recipe/recipe.types';
import type { UserProfile } from '../account/account.types';

/**
 * Cloud Service
 * 
 * Handles cloud backup and synchronization of recipes and shared recipes.
 * Cloud Services are only available to authorized users with the `cloud_storage` permission.
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
 */
export class CloudService {
  private supabase: SupabaseClient;

  private _userId: string;

  constructor(supabase: SupabaseClient, userId: string) {
    this.supabase = supabase;
    this._userId = userId;
  }

  /**
   * Create a shared recipe link for a recipe.
   * 
   * @param recipe - The recipe to create a shared link for.
   * @returns The shared link.
   */
  async createSharedRecipeUrl(recipe: SavedRecipe, expiresAt?: Date): Promise<{ token: string; url: string }> {
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
        expires_at: expiresAt ? expiresAt.toISOString() : null
      })
      .select();

    if (error) throw error;

    return { token, url: `/share/${token}` };
  }

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
      .eq('archived', true);

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
   * @param recipe - The recipe to sync.
   */
  async syncLocalRecipe(recipe: SavedRecipe): Promise<void> {
    const { error } = await this.supabase
      .from('recipes')
      .upsert(recipe);

    if (error) throw error;
  }

  /**
   * Upload all local recipes to the cloud.
   * 
   * @param recipes - The recipes to sync.
   */
  async syncAllLocalRecipes(recipes: SavedRecipe[]): Promise<void> {
    const { error } = await this.supabase
      .from('recipes')
      .upsert(recipes);

    if (error) throw error;
  }

  /**
   * Download all cloud recipes to local storage.
   * 
   * @returns The synced recipes or null if there was an error.
   */
  async syncRecipesFromRemote(): Promise<SavedRecipe[] | null> {
    const { data, error }: { data: SavedRecipe[] | null; error: Error | null } = await this.supabase
      .from('recipes')
      .select('*')
      .eq('owner_id', this._userId);

    if (error) throw error;

    return data;
  }
}
