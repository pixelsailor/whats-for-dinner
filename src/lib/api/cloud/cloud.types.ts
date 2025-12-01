/**
 * Cloud Types
 * 
 * Types for cloud backup and synchronization of recipes and shared recipes.
 */

import { z } from 'zod';
import type { SharedRecipeSchema } from './cloud.schemas';

export type SharedRecipe = z.infer<typeof SharedRecipeSchema>;
