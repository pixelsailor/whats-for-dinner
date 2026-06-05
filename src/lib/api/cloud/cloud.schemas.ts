/**
 * @fileoverview Zod schemas for cloud-specific Supabase tables and sync projections.
 * @module lib/api/cloud/cloud.schemas
 */

import { z } from 'zod';

import { supabaseTimestamptzSchema } from '$lib/api/common/common.schemas';

/** Row shape for `shared_links` (public recipe sharing). */
export const SharedRecipeSchema = z.object({
  /** Token for sharing the recipe. */
  token: z.string(),
  /** User id of the recipe owner. */
  user_id: z.uuid(),
  /** Recipe id of the recipe being shared. */
  recipe_id: z.uuid(),
  /** Timestamp when the shared recipe was created. */
  created_at: supabaseTimestamptzSchema,
  /** Timestamp when the shared recipe expires. */
  expires_at: supabaseTimestamptzSchema.nullable().optional()
});
