/**
 * @fileoverview Remote Supabase I/O for recipe backup, sync, archive, and sharing.
 * @module lib/api/cloud/cloud.service
 */

import { SupabaseClient } from '@supabase/supabase-js';

import type {
  CloudRecipe,
  CloudRecipeSyncSummary,
  Recipe,
  SavedRecipe
} from '../recipe/recipe.types';
import {
  generateShareToken,
  parseCloudRecipe,
  parseCloudRecipeMaybe,
  parseCloudRecipeRows,
  parseCloudRecipeSyncSummaryRows,
  parseCloudRecipeUpdate,
  parseCloudRecipeUpload,
  parseSharedRecipeRows
} from './cloud.model';

/**
 * Cloud Service
 *
 * Handles cloud backup and synchronization of recipes and shared recipes.
 * Cloud Services are only available to authorized users with `read_cloud` and/or `write_cloud` permission.
 * Callers must check those flags before invoking mutate vs download paths; RLS remains the remote authority.
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
 *   if (!user || (!permissions?.read_cloud && !permissions?.write_cloud)) {
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
  async getAllRecipeSummaries(): Promise<CloudRecipeSyncSummary[]> {
    const { data, error } = await this.supabase
      .from('recipes')
      .select('title, short_description, id, last_synced_at')
      .eq('owner_id', this._userId)
      .is('archived', null);

    if (error) throw error;

    return parseCloudRecipeSyncSummaryRows(data ?? []);
  }

  /**
   * Create a shared recipe link for a recipe.
   *
   * @param recipe - The recipe to create a shared link for.
   * @returns The shared link.
   */
  async createSharedRecipeUrl(
    recipe: SavedRecipe,
    expiresAt?: string
  ): Promise<{ token: string; url: string }> {
    if (recipe.shared_id) {
      return { token: recipe.shared_id, url: `/share/${recipe.shared_id}` };
    }

    const token = generateShareToken();

    const { data, error } = await this.supabase
      .from('shared_links')
      .insert({
        token,
        recipe_id: recipe.id,
        user_id: this._userId,
        expires_at: expiresAt ? expiresAt : null
      })
      .select();

    if (error) throw error;

    parseSharedRecipeRows(data);

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
  async getArchivedRecipes(): Promise<CloudRecipe[] | null> {
    const { data, error } = await this.supabase
      .from('recipes')
      .select('*')
      .eq('owner_id', this._userId)
      .not('archived', 'is', null);

    if (error) throw error;

    return parseCloudRecipeRows(data);
  }

  /**
   * Download an archived recipe from the cloud.
   *
   * @param recipeId - The id of the recipe to download.
   * @returns The recipe.
   */
  async downloadArchivedRecipe(recipeId: string): Promise<CloudRecipe | null> {
    const { data, error } = await this.supabase
      .from('recipes')
      .select('*')
      .eq('owner_id', this._userId)
      .eq('id', recipeId)
      .single();

    if (error) throw error;

    return parseCloudRecipe(data);
  }

  /**
   * Prepare a local recipe for cloud upsert by assigning ownership and clearing stale sync flags.
   * @param recipe - Local recipe row to upload.
   * @returns Recipe payload safe to send to Supabase.
   */
  prepareRecipeForUpload(recipe: Recipe | SavedRecipe): CloudRecipe {
    const saved = recipe as SavedRecipe;

    return parseCloudRecipeUpload({
      ...saved,
      owner_id: this._userId,
      synced: true,
      sync_error: null
    });
  }

  /**
   * Upload a local recipe to the cloud.
   *
   * Supabase will automatically update the `last_synced_at` timestamp.
   *
   * @param recipe - The recipe to sync.
   */
  async uploadLocalRecipe(recipe: Recipe | SavedRecipe): Promise<CloudRecipe> {
    const payload = this.prepareRecipeForUpload(recipe);
    const { data, error } = await this.supabase
      .from('recipes')
      .upsert(payload)
      .select()
      .single();

    if (error) throw error;

    // return parseCloudRecipe(data);
    return data;
  }

  /**
   * Upload all local recipes to the cloud.
   *
   * @param recipes - The recipes to sync.
   */
  async uploadAllLocalRecipes(
    recipes: SavedRecipe[]
  ): Promise<CloudRecipe[] | null> {
    const payload = recipes.map((recipe) =>
      this.prepareRecipeForUpload(recipe)
    );
    const { data, error } = await this.supabase
      .from('recipes')
      .upsert(payload)
      .select();

    if (error) throw error;

    return parseCloudRecipeRows(data);
  }

  /**
   * Update a recipe in the cloud.
   *
   * @param recipeData - The recipe data to update.
   * @returns The updated recipe.
   */
  async updateRecipe(
    recipeData: Partial<SavedRecipe> & { id: string }
  ): Promise<CloudRecipe> {
    const validatedUpdate = parseCloudRecipeUpdate(recipeData);
    const { data, error } = await this.supabase
      .from('recipes')
      .update(validatedUpdate)
      .eq('id', validatedUpdate.id)
      .eq('owner_id', this._userId)
      .select()
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error(
        'Recipe not found in cloud or not owned by the current user'
      );
    }

    return parseCloudRecipe(data);
  }

  /**
   * Download all cloud recipes to local storage.
   *
   * @returns The synced recipes or null if there was an error.
   */
  async downloadAllRemoteRecipes(): Promise<CloudRecipe[] | null> {
    const { data, error } = await this.supabase
      .from('recipes')
      .select('*')
      .eq('owner_id', this._userId)
      .is('archived', null);

    if (error) throw error;

    return parseCloudRecipeRows(data);
  }

  /**
   * Download a single active recipe from the cloud.
   *
   * @param recipeId - The id of the recipe to download.
   * @returns The recipe or null if not found.
   */
  async downloadRecipeById(recipeId: string): Promise<CloudRecipe | null> {
    const { data, error } = await this.supabase
      .from('recipes')
      .select('*')
      .eq('owner_id', this._userId)
      .eq('id', recipeId)
      .maybeSingle();

    if (error) throw error;

    return parseCloudRecipeMaybe(data);
  }

  /**
   * Download a recipe that is exposed via `recipes.shared_id` (public share token on the row).
   * Does not filter by {@link CloudService._userId}; access is governed by Supabase RLS for the request client.
   *
   * @param sharedId - Token stored on `recipes.shared_id` (synced from `shared_links`).
   * @returns The recipe row, or null when none matches.
   */
  async downloadRecipeBySharedId(
    sharedId: string
  ): Promise<CloudRecipe | null> {
    const { data, error } = await this.supabase
      .from('recipes')
      .select('*')
      .eq('shared_id', sharedId)
      .maybeSingle();

    if (error) throw error;

    return parseCloudRecipeMaybe(data);
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
  async getDeletedRecipes(): Promise<CloudRecipe[] | null> {
    const { data, error } = await this.supabase
      .from('recipes')
      .select('*')
      .eq('owner_id', this._userId)
      .not('deleted_at', 'is', null);

    if (error) throw error;

    return parseCloudRecipeRows(data);
  }

  /**
   * Permanently delete a deleted recipe from the cloud.
   *
   * This action is irreversible and will permanently delete the recipe from the cloud. It should
   * only be called after the recipe has exceeded its expiry date.
   * The recipe must have a `deleted_at` timestamp to be deleted.
   *
   * @param recipeId - The id of the recipe to delete.
   */
  async deleteRecipe(recipeId: string): Promise<void> {
    const { error } = await this.supabase
      .from('recipes')
      .delete()
      .eq('id', recipeId)
      .eq('owner_id', this._userId)
      .not('deleted_at', 'is', null);

    if (error) throw error;
  }

  /**
   * Permanently delete deleted recipes from the cloud.
   *
   * This action is irreversible and will permanently delete the recipes from the cloud. It should
   * only be called after the recipes have exceeded their expiry date.
   * The recipes must have a `deleted_at` timestamp to be deleted.
   *
   * @param recipeIds - The ids of the recipes to delete.
   */
  async deleteDeletedRecipes(recipeIds: string[]): Promise<void> {
    const { error } = await this.supabase
      .from('recipes')
      .delete()
      .in('id', recipeIds)
      .eq('owner_id', this._userId)
      .not('deleted_at', 'is', null);

    if (error) throw error;
  }
}
