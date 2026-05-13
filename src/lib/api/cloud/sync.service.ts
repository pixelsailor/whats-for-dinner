/**
 * Sync Service
 * 
 * Orchestrates synchronization between local Dexie storage and remote Supabase.
 * Uses pure sync logic from `cloud.model.ts` (buildSyncPlan) and keeps Dexie
 * concerns out of `CloudService`.
 * 
 * Note: This service does not include support for uploading and syncing new recipes. Use the
 * `CloudService` and sync manually for new recipes to avoid extraneous sync operations.
 */
import { db } from '$lib/db';
import type { SavedRecipe } from '$lib/api/recipe';
import { CloudService } from './cloud.service';
import { buildSyncPlan, isActive } from './cloud.model';
import type {
  ConflictResolution,
  SyncConflict,
  SyncPlan,
} from './cloud.types';
import type { ApiResponse } from '../ai';

/**
 * Sync service for syncing recipes between local and remote.
 * 
 * @param cloudService - The cloud service to use for syncing.
 * 
 * @example
 * ```typescript
 * const syncService = new SyncService(cloudService);
 * const plan = await syncService.buildPlan();
 * 
 * await syncService.uploadRecipes(plan.localOnly);
 * await syncService.downloadRecipes(plan.cloudOnly);
 * await syncService.resolveConflicts(plan.conflicts);
 * 
 * // Or, if you want to resolve conflicts one at a time:
 * for (const conflict of plan.conflicts) {
 *   await syncService.resolveConflict(conflict, 'upload');
 *   await syncService.resolveConflict(conflict, 'download');
 * }
 * ```
 */
export class SyncService {
  private cloud: CloudService;

  constructor(cloudService: CloudService) {
    this.cloud = cloudService;
  }

  /**
   * Build a sync plan for syncing recipes between local and remote.
   * 
   * The sync plan is a list of recipes that need to be uploaded, downloaded, or have conflicts.
   * 
   * @returns The sync plan.
   */
  async buildPlan(): Promise<SyncPlan> {
    const [localRecipes, remoteRecipes] = await Promise.all([
      this.getLocalActiveRecipes(),
      this.getRemoteActiveRecipes(),
    ]);

    return buildSyncPlan(localRecipes, remoteRecipes);
  }

  /**
   * Upload a single recipe to the cloud.
   * This method has limited functionality as it only update the local database if the upload fails.
   * 
   * @param recipe - The recipe to upload.
   * @returns The id of the uploaded recipe.
   */
  async uploadRecipe(recipe: SavedRecipe): Promise<string | null> {
    const payload: SavedRecipe = {
      ...recipe,
      synced: true,
      sync_error: null,
    };

    try {
      const uploaded = await this.cloud.uploadLocalRecipe(payload);
      if (!uploaded) return null;
      return uploaded.id;
    } catch (err) {
      const failed: SavedRecipe = {
        ...recipe,
        updated_at: new Date().toISOString(),
        synced: false,
        sync_error: err instanceof Error ? err.message : 'Unknown sync error',
      };
      await db.recipes.put(failed);
      return failed.id;
    }
  }

  /**
   * Upload a single recipe to the cloud.
   * Automatically updates/syncs the local database with the uploaded response. Uploads that fail
   * are automatically saved locally with the current timestamp.
   * 
   * Supabase will automatically update the `last_synced_at` and `updated_at` timestamps.
   * 
   * @param recipe - The recipe to upload.
   * @returns The id of the uploaded recipe.
   */
  async uploadRecipeAndSyncLocal(recipe: SavedRecipe): Promise<string | null> {
    const payload: SavedRecipe = {
      ...recipe,
      synced: true,
      sync_error: null,
    };
    try {
      const uploaded = await this.cloud.uploadLocalRecipe(payload);
      if (!uploaded) return null;

      // Update the local database with the uploaded recipe
      await db.recipes.put(uploaded);
      return uploaded.id;
    } catch (err) {
      const failed: SavedRecipe = {
        ...recipe,
        updated_at: new Date().toISOString(),
        synced: false,
        sync_error: err instanceof Error ? err.message : 'Unknown sync error',
      };
      await db.recipes.put(failed);
      return failed.id;
    }
  }

  /**
   * Upload recipes to the cloud and silently sync the local database.
   * 
   * @param recipes - The recipes to upload.
   */
  async uploadRecipes(recipes: SavedRecipe[]): Promise<void> {
    if (!recipes.length) return;
    const payload: SavedRecipe[] = recipes.map((recipe) => ({
      ...recipe,
      synced: true,
      sync_error: null,
    }));
    try {
      const uploaded = await this.cloud.uploadAllLocalRecipes(payload);
      if (!uploaded) return;

      await db.recipes.bulkPut(uploaded);
    } catch (err) {
      const now = new Date().toISOString();
      const failed = recipes.map((recipe) => ({
        ...recipe,
        updated_at: now,
        synced: false,
        sync_error: err instanceof Error ? err.message : 'Unknown sync error',
      }));
      await db.recipes.bulkPut(failed);
    }
  }

  /**
   * Update a recipe in the cloud and silently sync the local database.
   * 
   * Failed updates should continue to update the local database regardless. A sync error will be 
   * recorded in the recipe and the error propagated to the caller.
   * 
   * @param recipeData - The recipe data to update.
   * @returns The updated recipe.
   */
  async updateRecipeAndSyncLocal(recipeData: Partial<SavedRecipe> & { id: string }): Promise<ApiResponse<string>> {
    if (!recipeData.id) throw new Error('Recipe ID is required');
    try {
      const updated = await this.cloud.updateRecipe(recipeData);
      await db.recipes.update(recipeData.id, updated);
      return { success: true, data: recipeData.id };
    } catch (err) {
      const failed: Partial<SavedRecipe> & { id: string } = {
        ...recipeData,
        updated_at: new Date().toISOString(),
        synced: false,
        sync_error: err instanceof Error ? err.message : 'Unknown sync error',
      };
      await db.recipes.update(recipeData.id, failed);
      return { success: false, data: recipeData.id, error: { message: err instanceof Error ? err.message : 'Unknown sync error' } };
    }
  }

  /**
   * Delete a recipe from the cloud and silently sync the local database.
   * 
   * @param id - The id of the recipe to delete.
   */
  async deleteRecipeAndSyncLocal(id: string) {
    if (!id) throw new Error('Recipe ID is required');
    try {
      await this.cloud.deleteRecipe(id);
      await db.recipes.delete(id);
      return { success: true, data: void 0 };
    } catch (err) {
      // Note that if the delete fails the local database will not be updated in this case.
      // Deleting the recipe locally would make the cloud unaware of the recipe state and cause 
      // the recipe to be restored during the next sync. The local record should be updated
      // with a sync error.
      return { success: false, error: { message: err instanceof Error ? err.message : 'Unknown sync error' } };
    }
  }

  /**
   * Permanently delete deleted recipes from the cloud and silently sync the local database.
   * 
   * This action is irreversible and will permanently delete the recipes from the cloud. It should
   * only be called after the recipes have exceeded their expiry date.
   * The recipes must have a `deleted_at` timestamp to be deleted.
   * 
   * @param recipeIds - The ids of the recipes to delete.
   */
  async deleteDeletedRecipesAndSyncLocal(recipeIds: string[]) {
    if (!recipeIds.length) throw new Error('Recipe IDs are required');
    try {
      await this.cloud.deleteDeletedRecipes(recipeIds);
      await db.recipes.bulkDelete(recipeIds);
      return { success: true, data: void 0 };
    } catch (err) {
      // Note that if the delete fails the local database will not be updated in this case.
      // Deleting the recipe locally would make the cloud unaware of the recipe state and cause 
      // the recipe to be restored during the next sync. The local record should be updated
      // with a sync error.
      return { success: false, error: { message: err instanceof Error ? err.message : 'Unknown sync error' } };
    }
  }

  /**
   * Download recipes from the cloud.
   * 
   * @param recipes - The recipes to download.
   */
  async downloadRecipes(recipes: SavedRecipe[]): Promise<void> {
    if (!recipes.length) return;

    const normalized = recipes.map((recipe) => ({
      ...recipe,
      synced: true,
      sync_error: null,
    }));

    await db.recipes.bulkPut(normalized);
  }

  /**
   * Fetches one owned recipe from the cloud and persists it to Dexie (same normalization as {@link SyncService.downloadRecipes}).
   *
   * @param recipeId - Primary key of the recipe in the cloud.
   * @returns The recipe after merge into local storage, or null if the cloud returned no row (when supported by the client).
   */
  async downloadRecipeById(recipeId: string): Promise<SavedRecipe | null> {
    const remote = await this.cloud.downloadRecipeById(recipeId);
    if (!remote) return null;
    await this.downloadRecipes([remote]);
    return remote;
  }

  /**
   * Fetches a publicly shared recipe by `shared_id` and persists it to Dexie.
   *
   * @param sharedId - Share token on `recipes.shared_id`.
   * @returns The recipe after merge into local storage, or null if not found.
   */
  async downloadRecipeBySharedId(sharedId: string): Promise<SavedRecipe | null> {
    const remote = await this.cloud.downloadRecipeBySharedId(sharedId);
    if (!remote) return null;
    await this.downloadRecipes([remote]);
    return remote;
  }

  /**
   * Resolve a conflict between a local and a cloud recipe.
   * 
   * @param conflict - The conflict to resolve.
   * @param action - The action to take.
   */
  async resolveConflict(conflict: SyncConflict, action: 'upload' | 'download'): Promise<void> {
    if (action === 'upload') {
      await this.uploadRecipes([conflict.local]);
    } else {
      await this.downloadRecipes([conflict.cloud]);
    }
  }

  /**
   * Resolve conflicts automatically when an action is already chosen.
   */
  async resolveConflictsAutomatically(conflicts: ConflictResolution[]): Promise<void> {
    if (!conflicts.length) return;
    const uploads = conflicts
      .filter((item) => item.action === 'upload')
      .map((item) => item.conflict.local);
    const downloads = conflicts
      .filter((item) => item.action === 'download')
      .map((item) => item.conflict.cloud);

    if (uploads.length) {
      await this.uploadRecipes(uploads);
    }
    if (downloads.length) {
      await this.downloadRecipes(downloads);
    }
  }

  /**
   * Get all active local recipes.
   * 
   * @returns The active local recipes from the local database.
   */
  private async getLocalActiveRecipes(): Promise<SavedRecipe[]> {
    const all = await db.recipes.toArray();
    return all.filter(isActive);
  }

  /**
   * Get all active remote recipes from the cloud.
   * 
   * @returns The active remote recipes from the cloud.
   */
  private async getRemoteActiveRecipes(): Promise<SavedRecipe[]> {
    const remote = await this.cloud.downloadAllRemoteRecipes();
    if (!remote) return [];
    return remote.filter(isActive);
  }
}

