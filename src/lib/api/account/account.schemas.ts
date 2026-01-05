/**
 * User account information and permissions.
 */

import { z } from 'zod';

/**
 * User preferences for recipe suggestions and instructions.
 */
export const UserPreferencesSchema = z.object({
	/** Dietary restrictions or preferences (e.g., ['vegetarian']). */
	diet: z.array(z.string()).optional().nullable(),
	/** Allergies the user has (e.g., ['peanuts']). */
	allergies: z.array(z.string()).optional().nullable(),
	/** Ingredients the user dislikes. */
	dislikes: z.array(z.string()).optional().nullable(),
	/** Preferred cuisines (e.g., ['italian']). */
	cuisine_preferences: z.array(z.string()).optional().nullable(),
	/** Available equipment (e.g., ['oven','instant-pot']). */
	equipment: z.array(z.string()).optional().nullable(),
	/** Skill level to tune suggestions or instructions. */
	skill_level: z.string().optional().nullable(),
	/** Preferred prep time bucket. */
	preferred_prep_time: z.string().optional().nullable()
});

/**
 * User account information and permissions.
 */
export const UserProfileSchema = z.object({
	id: z.uuid(),
	/** Supabase user ID. */
	user_id: z.uuid(),
	/** Whether the user has access to AI assisted recipe generation. */
	ai_assistance: z.boolean(),
	/** Whether the user has access to cloud storage. */
	cloud_storage: z.boolean(),
	/** User preferences. */
	preferences: UserPreferencesSchema.optional().nullable()
});

export const UserPreferencesRepsonseSchema = UserPreferencesSchema.extend({
	id: z.uuid().nullable().optional(),
	user_id: z.uuid(),
	created_at: z.iso.datetime().nullable().optional(),
	updated_at: z.iso.datetime().nullable().optional()
});
