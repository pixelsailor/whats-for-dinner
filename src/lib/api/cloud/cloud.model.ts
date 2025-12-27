import type { SavedRecipe } from '../recipe/recipe.types';
import type {
  ConflictResolution,
  EnhancedSyncPlan,
  SyncConflict,
  SyncPlan,
  SyncScenario,
} from './cloud.types';
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

const CONFLICT_TIMESTAMP_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

const compareMillis = (value: string | number | Date | null | undefined): number => {
  return toMillis(value ?? '');
};

export const categorizeConflict = (conflict: SyncConflict): ConflictResolution => {
  const { local, cloud } = conflict;

  const localUpdated = compareMillis(local.updated_at ?? '');
  const cloudUpdated = compareMillis(cloud.updated_at ?? '');
  const localSynced = compareMillis(local.last_synced_at ?? '');
  const cloudSynced = compareMillis(cloud.last_synced_at ?? '');

  const localNeverSynced = !local.last_synced_at;
  const cloudNeverSynced = !cloud.last_synced_at;
  const localSyncError = local.synced === false || Boolean(local.sync_error);

  const localNewer = localUpdated > cloudUpdated;
  const cloudNewer = cloudUpdated > localUpdated;

  const localUpdatedAfterSync = localUpdated > localSynced;
  const cloudUpdatedAfterSync = cloudUpdated > cloudSynced;
  const updatedDiff = Math.abs(localUpdated - cloudUpdated);

  if (localNeverSynced) {
    return { conflict, action: 'upload', reason: 'local-never-synced' };
  }

  if (cloudNeverSynced) {
    return { conflict, action: 'download', reason: 'cloud-never-synced' };
  }

  if (localSyncError && localNewer) {
    return { conflict, action: 'upload', reason: 'local-sync-error-newer' };
  }

  if (localSyncError && cloudNewer) {
    return { conflict, action: 'download', reason: 'local-sync-error-cloud-newer' };
  }

  if (localNewer && cloudSynced >= localSynced) {
    return { conflict, action: 'upload', reason: 'local-updated-more-recent' };
  }

  if (cloudNewer && cloudSynced > localSynced) {
    return { conflict, action: 'download', reason: 'cloud-updated-more-recent' };
  }

  if (localUpdatedAfterSync && cloudUpdatedAfterSync && updatedDiff <= CONFLICT_TIMESTAMP_WINDOW_MS) {
    return { conflict, action: 'manual', reason: 'both-updated-close-timestamps' };
  }

  if (localNewer) {
    return { conflict, action: 'upload', reason: 'local-updated-newer' };
  }

  if (cloudNewer) {
    return { conflict, action: 'download', reason: 'cloud-updated-newer' };
  }

  return { conflict, action: 'manual', reason: 'equal-timestamps' };
};

/**
 * Build a sync plan for syncing recipes between local and remote.
 * 
 * The sync plan is a list of recipes that need to be uploaded, downloaded, or have conflicts.
 * 
 * @param localRecipes - The local recipes to sync.
 * @param remoteRecipes - The remote recipes to sync.
 * @returns The sync plan.
 */
export const buildSyncPlan = (
  localRecipes: SavedRecipe[],
  remoteRecipes: SavedRecipe[],
): EnhancedSyncPlan => {
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

  const categorized = conflicts.map(categorizeConflict);
  const autoResolvable = categorized.filter((item) => item.action !== 'manual');
  const manualConflicts = categorized.filter((item) => item.action === 'manual').map((item) => item.conflict);

  return {
    scenario,
    localOnly,
    cloudOnly,
    conflicts,
    matched,
    autoResolvable,
    manualConflicts,
  };
};
