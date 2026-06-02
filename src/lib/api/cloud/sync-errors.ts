/**
 * @fileoverview Normalizes unknown sync failures into user-visible error messages.
 * @module lib/api/cloud/sync-errors
 */

/**
 * Extract a readable message from Supabase, Dexie, or generic thrown values.
 * @param err - Value caught during a cloud sync operation.
 * @returns A non-empty error message suitable for `sync_error` or toast copy.
 */
export function formatSyncError(err: unknown): string {
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }

  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  if (typeof err === 'string' && err.trim()) {
    return err;
  }

  return 'Unknown sync error';
}
