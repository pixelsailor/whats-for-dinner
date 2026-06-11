import { writable } from 'svelte/store';

import type { SyncConflict, SyncScenario } from '$lib/api/cloud';
import type { SavedRecipe } from '$lib/api/recipe/recipe.types';

export type SyncStatus =
  | 'idle'
  | 'checking'
  | 'awaiting-confirmation'
  | 'syncing'
  | 'complete'
  | 'error';

export type SyncState = {
  status: SyncStatus;
  scenario: SyncScenario | null;
  conflicts: SyncConflict[];
  localOnly: SavedRecipe[];
  cloudOnly: SavedRecipe[];
  progress: {
    uploaded: number;
    downloaded: number;
    total: number;
  };
  message?: string;
  toastId?: string | number;
  cancelRequested: boolean;
};

const initialState: SyncState = {
  status: 'idle',
  scenario: null,
  conflicts: [],
  localOnly: [],
  cloudOnly: [],
  progress: {
    uploaded: 0,
    downloaded: 0,
    total: 0
  },
  message: undefined,
  toastId: undefined,
  cancelRequested: false
};

export const syncStore = writable<SyncState>(initialState);

export const resetSyncStore = () => syncStore.set(initialState);

export const updateSyncStore = (
  patch: Partial<SyncState> | ((state: SyncState) => SyncState)
) =>
  syncStore.update((state) =>
    typeof patch === 'function' ? patch(state) : { ...state, ...patch }
  );
