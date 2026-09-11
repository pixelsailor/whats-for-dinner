/**
 * @fileoverview Queues local last_opened writes and batches cloud sync for view metadata.
 * @module lib/api/cloud/last-opened-pending
 */

import { db } from '$lib/db';
import type { SyncService } from './sync.service';

/** In-memory pending last_opened values awaiting batch cloud flush. */
const pendingLastOpened = new Map<string, string>();

/**
 * Persists last_opened locally and queues the id for batch cloud flush.
 * @param recipeId - Recipe id to update
 * @param lastOpened - ISO timestamp for last_opened
 * @remarks Does not bump updated_at; sets synced false for pending view metadata only.
 */
export async function markLastOpenedLocally(
  recipeId: string,
  lastOpened: string
): Promise<void> {
  await db.recipes.update(recipeId, {
    last_opened: lastOpened,
    synced: false
  });
  pendingLastOpened.set(recipeId, lastOpened);
}

/**
 * Read-only view of pending ids mapped to the latest last_opened ISO string.
 * @returns Pending last_opened entries
 */
export function getPendingLastOpenedIds(): ReadonlyMap<string, string> {
  return pendingLastOpened;
}

/**
 * Flushes pending last_opened patches when online and cloud write is allowed.
 * @param options - Sync service and capability signals
 * @remarks No network I/O when pending is empty; clears each id only after a successful cloud update.
 */
export async function flushPendingLastOpened(options: {
  syncService: SyncService;
  canWriteCloud: boolean;
  online: boolean;
}): Promise<void> {
  if (pendingLastOpened.size === 0) {
    return;
  }

  if (!options.online || !options.canWriteCloud) {
    return;
  }

  const entries = [...pendingLastOpened.entries()];
  for (const [id, lastOpened] of entries) {
    const result = await options.syncService.updateRecipeAndSyncLocal({
      id,
      last_opened: lastOpened
    });
    if (result.success) {
      pendingLastOpened.delete(id);
    }
  }
}

/**
 * Starts a periodic flush for pending last_opened values.
 * @param options - Sync service accessors and capability signals
 * @returns Stop function that clears the interval
 */
export function startLastOpenedBatchSync(options: {
  getSyncService: () => SyncService | null;
  getCanWriteCloud: () => boolean;
  getOnline: () => boolean;
  intervalMs?: number;
}): () => void {
  const intervalMs = options.intervalMs ?? 30_000;
  const intervalId = setInterval(() => {
    const syncService = options.getSyncService();
    if (!syncService) {
      return;
    }

    void flushPendingLastOpened({
      syncService,
      canWriteCloud: options.getCanWriteCloud(),
      online: options.getOnline()
    });
  }, intervalMs);

  return () => {
    clearInterval(intervalId);
  };
}
