/**
 * Sync Service
 * 
 * Orchestrates synchronization between local Dexie storage and remote Supabase.
 * Uses pure sync logic from `cloud.model.ts` (buildSyncPlan) and keeps Dexie
 * concerns out of `CloudService`.
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

