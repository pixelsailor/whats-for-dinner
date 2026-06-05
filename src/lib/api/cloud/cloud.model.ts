/**
 * @fileoverview Pure cloud sync helpers and Zod boundary parsers; no Supabase I/O.
 * @module lib/api/cloud/cloud.model
 */

import { z } from 'zod';

import { CloudRecipeSchema, CloudRecipeSyncSummarySchema, SavedRecipeSchema } from '../recipe/recipe.schemas';
import type { CloudRecipe, CloudRecipeSyncSummary, SavedRecipe } from '../recipe/recipe.types';
import { SharedRecipeSchema } from './cloud.schemas';
import type { ConflictResolution, SharedRecipe, SyncConflict, SyncPlan, SyncScenario } from './cloud.types';
import randomBytes from '$lib/utils/randombytes';
import toMillis from '$lib/utils/toMilliseconds';

/** Base58 alphabet for public share link tokens (excludes 0, O, I, l). */
export const SHARE_TOKEN_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/** Number of random bytes encoded into a share link token. */
export const SHARE_TOKEN_BYTE_LENGTH = 8;

/** Partial `recipes` row accepted by {@link CloudService.updateRecipe}. */
const CloudRecipeUpdateSchema = SavedRecipeSchema.extend({ owner_id: z.uuid() })
  .partial()
  .extend({ id: z.uuid() });

/** Optional context for a single cloud recipe row that failed validation. */
export type CloudRecipeParseFailure = {
  recipeId?: string;
  recipeTitle?: string;
  fieldErrors: Record<string, string[]>;
};

/** Thrown when Supabase row JSON fails Zod validation at the cloud service boundary. */
export class CloudParseError extends Error {
  /** Set when a specific `recipes` row failed validation (for sync repair UI). */
  readonly recipeId?: string;

  /** Set when a specific `recipes` row failed validation (for sync repair UI). */
  readonly recipeTitle?: string;

  /** Zod field errors for the failing row, when applicable. */
  readonly fieldErrors?: Record<string, string[]>;

  constructor(message: string, details?: Omit<CloudRecipeParseFailure, 'fieldErrors'> & { fieldErrors?: Record<string, string[]> }) {
    super(message);
    this.name = 'CloudParseError';
    this.recipeId = details?.recipeId;
    this.recipeTitle = details?.recipeTitle;
    this.fieldErrors = details?.fieldErrors;
  }
}

/**
 * Extracts id/title from a raw Supabase `recipes` row for error reporting.
 * @param data - Unvalidated row JSON
 */
function cloudRecipeRowIdentity(data: unknown): { recipeId?: string; recipeTitle?: string } {
  if (typeof data !== 'object' || data === null) {
    return {};
  }

  const row = data as Record<string, unknown>;

  return {
    recipeId: typeof row.id === 'string' ? row.id : undefined,
    recipeTitle: typeof row.title === 'string' ? row.title : undefined
  };
}

/**
 * @param identity - Recipe id/title when known
 * @returns Suffix for error messages
 */
function formatRecipeIdentitySuffix(identity: { recipeId?: string; recipeTitle?: string }): string {
  if (identity.recipeId && identity.recipeTitle) {
    return ` (recipe "${identity.recipeTitle}", id ${identity.recipeId})`;
  }

  if (identity.recipeId) {
    return ` (recipe id ${identity.recipeId})`;
  }

  if (identity.recipeTitle) {
    return ` (recipe "${identity.recipeTitle}")`;
  }

  return '';
}

/**
 * Validates one cloud recipe row and throws {@link CloudParseError} with row context on failure.
 * @param data - Raw row from Supabase
 * @param context - Label for logs and error messages
 * @returns Typed cloud recipe
 */
function parseCloudRecipeOrThrow(data: unknown, context: string): CloudRecipe {
  const result = CloudRecipeSchema.safeParse(data);

  if (!result.success) {
    const identity = cloudRecipeRowIdentity(data);
    const fieldErrors = result.error.flatten().fieldErrors;
    console.error(`Cloud data validation failed for "${context}".`, fieldErrors, identity);
    throw new CloudParseError(`Cloud data failed validation for "${context}"${formatRecipeIdentitySuffix(identity)}.`, {
      ...identity,
      fieldErrors
    });
  }

  return result.data;
}

/**
 * @param result - Zod safeParse outcome
 * @param context - Label for logs and error messages
 * @returns Validated payload
 * @throws {CloudParseError} When validation fails
 */
function parseOrThrow<T>(result: z.ZodSafeParseResult<T>, context: string): T {
  if (!result.success) {
    console.error(`Cloud data validation failed for "${context}".`, result.error.flatten());
    throw new CloudParseError(`Cloud data failed validation for "${context}".`);
  }

  return result.data;
}

/**
 * Validates a `shared_links` row from Supabase.
 * @param data - Raw row from `.select()` / `.single()`
 * @returns Typed shared link
 * @throws {CloudParseError} When the row does not match {@link SharedRecipeSchema}
 */
export function parseSharedRecipe(data: unknown): SharedRecipe {
  return parseOrThrow(SharedRecipeSchema.safeParse(data), 'shared link');
}

/**
 * Validates `shared_links` rows returned from `.select()` after insert.
 * @param data - Raw array from Supabase
 * @returns Typed shared link rows
 * @throws {CloudParseError} When any row fails validation
 */
export function parseSharedRecipeRows(data: unknown): SharedRecipe[] {
  return parseOrThrow(z.array(SharedRecipeSchema).safeParse(data), 'shared link rows');
}

/**
 * Validates a cloud `recipes` row with a non-null `owner_id`.
 * @param data - Raw row from `.select()` / `.single()`
 * @returns Typed cloud recipe
 * @throws {CloudParseError} When the row does not match {@link CloudRecipeSchema}
 */
export function parseCloudRecipe(data: unknown): CloudRecipe {
  return parseCloudRecipeOrThrow(data, 'cloud recipe');
}

/**
 * Validates a cloud recipe row or null from `.maybeSingle()`.
 * @param data - Raw row or null from Supabase
 * @returns Typed recipe or null when absent
 * @throws {CloudParseError} When a non-null row fails validation
 */
export function parseCloudRecipeMaybe(data: unknown): CloudRecipe | null {
  if (data === null || data === undefined) {
    return null;
  }

  return parseCloudRecipe(data);
}

/**
 * Validates cloud `recipes` rows from `.select()`.
 * @param data - Raw array or null from Supabase
 * @returns Typed recipe rows, or null when Supabase returns null
 * @throws {CloudParseError} When any non-null row fails validation
 */
export function parseCloudRecipeRows(data: unknown): CloudRecipe[] | null {
  if (data === null || data === undefined) {
    return null;
  }

  if (!Array.isArray(data)) {
    return parseOrThrow(z.array(CloudRecipeSchema).safeParse(data), 'cloud recipe rows');
  }

  return data.map((row, index) => parseCloudRecipeOrThrow(row, `cloud recipe rows[${index}]`));
}

/**
 * Validates a recipe payload before upsert to Supabase.
 * @param data - Prepared upload row from {@link CloudService.prepareRecipeForUpload}
 * @returns Typed upload payload
 * @throws {CloudParseError} When fields are invalid
 */
export function parseCloudRecipeUpload(data: unknown): CloudRecipe {
  return parseCloudRecipeOrThrow(data, 'cloud recipe upload');
}

/**
 * Validates a partial recipe update before writing to Supabase.
 * @param data - Fields to merge into `recipes`
 * @returns Typed update payload
 * @throws {CloudParseError} When fields are invalid
 */
export function parseCloudRecipeUpdate(data: unknown): Partial<CloudRecipe> & { id: string } {
  return parseOrThrow(CloudRecipeUpdateSchema.safeParse(data), 'cloud recipe update');
}

/**
 * Validates sync summary rows from {@link CloudService.getAllRecipeSummaries}.
 * @param data - Raw array from Supabase
 * @returns Typed summary rows
 * @throws {CloudParseError} When any row fails validation
 */
export function parseCloudRecipeSyncSummaryRows(data: unknown): CloudRecipeSyncSummary[] {
  return parseOrThrow(z.array(CloudRecipeSyncSummarySchema).safeParse(data), 'cloud recipe summaries');
}

/**
 * Whether a recipe is visible in active recipe lists (not archived, not soft-deleted).
 * @param recipe - Local or cloud recipe row.
 */
export const isActive = (recipe: SavedRecipe): boolean => !recipe.archived && !recipe.deleted_at;

/**
 * Whether a recipe participates in sync planning (active or tombstoned, but not archived).
 * @param recipe - Local or cloud recipe row.
 * @remarks Tombstoned rows must sync so deletes and restores propagate per ADR-005.
 */
export const isSyncable = (recipe: SavedRecipe): boolean => !recipe.archived;

/**
 * Encode random bytes into a share link token using {@link SHARE_TOKEN_ALPHABET}.
 * @param bytes - Random bytes to map into the token alphabet.
 * @returns Token string with one character per input byte.
 */
export const encodeShareToken = (bytes: Uint8Array): string =>
  Array.from(bytes)
    .map((b) => SHARE_TOKEN_ALPHABET[b % SHARE_TOKEN_ALPHABET.length])
    .join('');

/**
 * Generate a short random share link token for `shared_links.token`.
 * @returns Base58-style token suitable for `/share/{token}` URLs.
 */
export const generateShareToken = (): string => encodeShareToken(randomBytes(SHARE_TOKEN_BYTE_LENGTH));

/**
 * Whether a local recipe still needs to be pushed to or reconciled with the cloud.
 * @param recipe - Local recipe row from Dexie.
 * @returns True when the row is marked unsynced or carries a prior sync failure.
 */
export const needsCloudSync = (recipe: SavedRecipe): boolean => recipe.synced === false || Boolean(recipe.sync_error);

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

  const localDeleted = Boolean(local.deleted_at);
  const cloudDeleted = Boolean(cloud.deleted_at);

  if (localDeleted !== cloudDeleted) {
    if (localDeleted) {
      if (localUpdated > cloudUpdated) {
        return { conflict, action: 'upload', reason: 'local-tombstone-newer' };
      }

      if (cloudUpdated > localUpdated) {
        return { conflict, action: 'download', reason: 'cloud-active-or-restored-newer' };
      }

      return { conflict, action: 'manual', reason: 'delete-state-mismatch-equal-timestamps' };
    }

    if (cloudUpdated > localUpdated) {
      return { conflict, action: 'download', reason: 'cloud-tombstone-newer' };
    }

    if (localUpdated > cloudUpdated) {
      return { conflict, action: 'upload', reason: 'local-active-or-restored-newer' };
    }

    return { conflict, action: 'manual', reason: 'delete-state-mismatch-equal-timestamps' };
  }

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
 * @param localRecipes - Syncable local rows (active and tombstoned; archived excluded).
 * @param remoteRecipes - Syncable remote rows (active and tombstoned; archived excluded).
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

    if ((localSynced ?? 0) !== (remoteSynced ?? 0) || needsCloudSync(local)) {
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
    manualConflicts
  };
};
