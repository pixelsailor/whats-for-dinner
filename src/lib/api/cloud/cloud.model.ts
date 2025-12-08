import type { SavedRecipe } from '../recipe/recipe.types';
import type { SyncConflict, SyncPlan, SyncScenario } from './cloud.types';
import toMillis from '$lib/utils/toMilliseconds';

/**
 * Cloud Models
 * 
 * Pure helpers for cloud backup and synchronization of recipes.
 * Keep this module side-effect free (no Dexie/Supabase imports).
 */

/**
 * Check if a recipe is active.
 * 
 * A recipe is active if it is not archived and not deleted.
 * 
 * @param recipe - The recipe to check.
 * @returns True if the recipe is active, false otherwise.
 */
export const isActive = (recipe: SavedRecipe): boolean => !recipe.archived && !recipe.deleted_at;

/**
 * Build a sync plan for syncing recipes between local and remote.
 * 
 * The sync plan is a list of recipes that need to be uploaded, downloaded, or have conflicts.
 * 
 * @param localRecipes - The local recipes to sync.
 * @param remoteRecipes - The remote recipes to sync.
 * @returns The sync plan.
 */
export const buildSyncPlan = (localRecipes: SavedRecipe[], remoteRecipes: SavedRecipe[]): SyncPlan => {
  const remoteById = new Map(remoteRecipes.map((recipe) => [recipe.id, recipe]));

  const localOnly: SavedRecipe[] = [];
  const conflicts: SyncConflict[] = [];
  const matched: SavedRecipe[] = [];

  for (const local of localRecipes) {
    const remote = remoteById.get(local.id);
    if (!remote) {
      localOnly.push(local);
      continue;
    }

    remoteById.delete(local.id);

    const localSynced = toMillis(local.last_synced_at ?? '');
    const remoteSynced = toMillis(remote.last_synced_at ?? '');

    if ((localSynced ?? 0) !== (remoteSynced ?? 0)) {
      conflicts.push({ local, cloud: remote });
    } else {
      matched.push(local);
    }
  }

  const cloudOnly = Array.from(remoteById.values());

  let scenario: SyncScenario = 'no-conflicts';
  if (localRecipes.length === 0 && remoteRecipes.length === 0) {
    scenario = 'empty';
  } else if (remoteRecipes.length === 0) {
    scenario = 'first-sync';
  } else if (localRecipes.length === 0) {
    scenario = 'download-only';
  } else if (conflicts.length > 0) {
    scenario = 'has-conflicts';
  }

  return {
    scenario,
    localOnly,
    cloudOnly,
    conflicts,
    matched,
  };
};
