import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SyncService } from './sync.service';

const { updateMock } = vi.hoisted(() => ({
  updateMock: vi.fn(() => Promise.resolve(1))
}));

vi.mock('$lib/db', () => ({
  db: {
    recipes: {
      update: updateMock
    }
  }
}));

import {
  flushPendingLastOpened,
  getPendingLastOpenedIds,
  markLastOpenedLocally
} from './last-opened-pending';

/**
 * Clears the module-level pending map between tests.
 */
function clearPending(): void {
  (getPendingLastOpenedIds() as Map<string, string>).clear();
}

/**
 * Builds a SyncService mock focused on updateRecipeAndSyncLocal.
 * @param success - Whether each update succeeds
 */
function createSyncServiceMock(success = true): {
  syncService: SyncService;
  updateRecipeAndSyncLocal: ReturnType<typeof vi.fn>;
} {
  const updateRecipeAndSyncLocal = vi.fn(async (payload: { id: string }) => ({
    success,
    data: payload.id
  }));

  return {
    syncService: { updateRecipeAndSyncLocal } as unknown as SyncService,
    updateRecipeAndSyncLocal
  };
}

describe('last-opened-pending', () => {
  beforeEach(() => {
    clearPending();
    updateMock.mockClear();
    updateMock.mockResolvedValue(1);
  });

  describe('markLastOpenedLocally', () => {
    it('AC-20: writes last_opened and synced:false without bumping updated_at', async () => {
      await markLastOpenedLocally(
        '00000000-0000-4000-8000-000000000001',
        '2024-06-10T12:00:00.000Z'
      );

      expect(updateMock).toHaveBeenCalledTimes(1);
      expect(updateMock).toHaveBeenCalledWith(
        '00000000-0000-4000-8000-000000000001',
        {
          last_opened: '2024-06-10T12:00:00.000Z',
          synced: false
        }
      );
      const payload = updateMock.mock.calls[0]?.[1] as Record<string, unknown>;
      expect(payload).not.toHaveProperty('updated_at');
    });

    it('AC-11: re-open before flush keeps a single pending entry with the newer timestamp', async () => {
      const id = '00000000-0000-4000-8000-000000000002';
      await markLastOpenedLocally(id, '2024-06-10T12:00:00.000Z');
      await markLastOpenedLocally(id, '2024-06-10T13:00:00.000Z');

      const pending = getPendingLastOpenedIds();
      expect(pending.size).toBe(1);
      expect(pending.get(id)).toBe('2024-06-10T13:00:00.000Z');
    });
  });

  describe('flushPendingLastOpened', () => {
    it('AC-12: empty pending does not call the cloud sync client', async () => {
      const { syncService, updateRecipeAndSyncLocal } =
        createSyncServiceMock();

      await flushPendingLastOpened({
        syncService,
        canWriteCloud: true,
        online: true
      });

      expect(updateRecipeAndSyncLocal).not.toHaveBeenCalled();
    });

    it('AC-13: non-empty pending issues one update per id with latest last_opened and clears on success', async () => {
      const idA = '00000000-0000-4000-8000-00000000000a';
      const idB = '00000000-0000-4000-8000-00000000000b';
      await markLastOpenedLocally(idA, '2024-06-10T12:00:00.000Z');
      await markLastOpenedLocally(idB, '2024-06-11T12:00:00.000Z');
      await markLastOpenedLocally(idA, '2024-06-10T14:00:00.000Z');

      const { syncService, updateRecipeAndSyncLocal } =
        createSyncServiceMock(true);

      await flushPendingLastOpened({
        syncService,
        canWriteCloud: true,
        online: true
      });

      expect(updateRecipeAndSyncLocal).toHaveBeenCalledTimes(2);
      expect(updateRecipeAndSyncLocal).toHaveBeenCalledWith({
        id: idA,
        last_opened: '2024-06-10T14:00:00.000Z'
      });
      expect(updateRecipeAndSyncLocal).toHaveBeenCalledWith({
        id: idB,
        last_opened: '2024-06-11T12:00:00.000Z'
      });
      for (const call of updateRecipeAndSyncLocal.mock.calls) {
        expect(Object.keys(call[0] as object).sort()).toEqual([
          'id',
          'last_opened'
        ]);
      }
      expect(getPendingLastOpenedIds().size).toBe(0);
    });

    it('AC-14: offline retains pending and makes no request', async () => {
      const id = '00000000-0000-4000-8000-00000000000c';
      await markLastOpenedLocally(id, '2024-06-10T12:00:00.000Z');
      const { syncService, updateRecipeAndSyncLocal } =
        createSyncServiceMock();

      await flushPendingLastOpened({
        syncService,
        canWriteCloud: true,
        online: false
      });

      expect(updateRecipeAndSyncLocal).not.toHaveBeenCalled();
      expect(getPendingLastOpenedIds().get(id)).toBe(
        '2024-06-10T12:00:00.000Z'
      );
    });

    it('AC-14: no write access retains pending and makes no request', async () => {
      const id = '00000000-0000-4000-8000-00000000000d';
      await markLastOpenedLocally(id, '2024-06-10T12:00:00.000Z');
      const { syncService, updateRecipeAndSyncLocal } =
        createSyncServiceMock();

      await flushPendingLastOpened({
        syncService,
        canWriteCloud: false,
        online: true
      });

      expect(updateRecipeAndSyncLocal).not.toHaveBeenCalled();
      expect(getPendingLastOpenedIds().get(id)).toBe(
        '2024-06-10T12:00:00.000Z'
      );
    });

    it('AC-22: flushes only pending map ids, not arbitrary content-pending rows', async () => {
      const pendingId = '00000000-0000-4000-8000-00000000000e';
      await markLastOpenedLocally(pendingId, '2024-06-10T12:00:00.000Z');

      const { syncService, updateRecipeAndSyncLocal } =
        createSyncServiceMock(true);

      await flushPendingLastOpened({
        syncService,
        canWriteCloud: true,
        online: true
      });

      expect(updateRecipeAndSyncLocal).toHaveBeenCalledTimes(1);
      expect(updateRecipeAndSyncLocal).toHaveBeenCalledWith({
        id: pendingId,
        last_opened: '2024-06-10T12:00:00.000Z'
      });
      expect(updateRecipeAndSyncLocal).not.toHaveBeenCalledWith(
        expect.objectContaining({
          id: '00000000-0000-4000-8000-contentpending'
        })
      );
    });

    it('retains pending when cloud update fails', async () => {
      const id = '00000000-0000-4000-8000-00000000000f';
      await markLastOpenedLocally(id, '2024-06-10T12:00:00.000Z');
      const { syncService, updateRecipeAndSyncLocal } =
        createSyncServiceMock(false);

      await flushPendingLastOpened({
        syncService,
        canWriteCloud: true,
        online: true
      });

      expect(updateRecipeAndSyncLocal).toHaveBeenCalledTimes(1);
      expect(getPendingLastOpenedIds().get(id)).toBe(
        '2024-06-10T12:00:00.000Z'
      );
    });
  });
});
