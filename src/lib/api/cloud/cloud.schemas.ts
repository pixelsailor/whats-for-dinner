/**
 * Cloud Schemas
 *
 * Zod schemas for cloud backup and synchronization of recipes and shared recipes.
 */

import { z } from 'zod';

export const SharedRecipeSchema = z.object({
	/** Token for sharing the recipe. */
	token: z.string(),
	/** User id of the recipe owner. */
	user_id: z.uuid(),
	/** Recipe id of the recipe being shared. */
	recipe_id: z.uuid(),
	/** Timestamp when the shared recipe was created. */
	created_at: z.coerce.date(),
	/** Timestamp when the shared recipe expires. */
	expires_at: z.coerce.date().nullable()
});
