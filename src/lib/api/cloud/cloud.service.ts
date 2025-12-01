/**
 * Cloud Service
 * 
 * Handles cloud backup and synchronization of recipes and shared recipes.
 */

import { SupabaseClient } from '@supabase/supabase-js';

import type { SavedRecipe } from '../recipe/recipe.types';

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
  async createSharedRecipeUrl(recipe: SavedRecipe) {
    const token = crypto.randomUUID();
    const { data, error } = await this.supabase
      .from('shared_links')
      .insert({
        token,
        recipe_id: recipe.id,
        user_id: recipe.owner_id,
        created_at: Date.now(),
        expires_at: Date.now() + 1000 * 60 * 60 * 24 * 30 // 30 days
      })
      .select();

    if (error) throw error;

    return { token, url: `/share/${token}` };
  }

  /**
   * Download an archived recipe from the cloud.
   * 
   * @param recipeId - The id of the recipe to download.
   * @returns The recipe.
   */
  async downloadArchivedRecipe(recipeId: string) {
    const { data, error } = await this.supabase
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
   * @returns The synced recipe.
   */
  async syncLocalRecipe(recipe: SavedRecipe) {
    const { data, error } = await this.supabase
      .from('recipes')
      .upsert(recipe)
      .select();

    if (error) throw error;

    return data;
  }

  /**
   * Upload all local recipes to the cloud.
   * 
   * @param recipes - The recipes to sync.
   * @returns The synced recipes.
   */
  async syncAllLocalRecipes(recipes: SavedRecipe[]) {
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
   * @returns The synced recipes.
   */
  async syncRecipesFromRemote() {
    const { data, error } = await this.supabase
      .from('recipes')
      .select('*')
      .eq('owner_id', this._userId);

    if (error) throw error;

    return data;
  }
}
