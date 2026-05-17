/**
 * Cloud Types
 *
 * Types for cloud backup and synchronization of recipes and shared recipes.
 */

import { z } from 'zod';

import type { SavedRecipe } from '../recipe/recipe.types';
import type { SharedRecipeSchema } from './cloud.schemas';

export type SharedRecipe = z.infer<typeof SharedRecipeSchema>;

export type SyncScenario = 'empty' | 'first-sync' | 'download-only' | 'has-conflicts' | 'no-conflicts';

export type SyncConflict = {
  local: SavedRecipe;
  cloud: SavedRecipe;
};

export type ConflictResolution = {
  conflict: SyncConflict;
  action: 'upload' | 'download' | 'manual';
  reason: string;
};

export type SyncPlan = {
  scenario: SyncScenario;
  localOnly: SavedRecipe[];
  cloudOnly: SavedRecipe[];
  conflicts: SyncConflict[];
  matched: SavedRecipe[];
  autoResolvable: ConflictResolution[];
  manualConflicts: SyncConflict[];
};
