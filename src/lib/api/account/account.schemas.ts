/**
 * @fileoverview Zod contracts for Supabase account profiles and user preferences rows.
 * @module lib/api/account/account.schemas
 */

import { supabaseTimestamptzSchema } from '$lib/api/common/common.schemas';
import { z } from 'zod';

/**
 * User preferences row in the `user_preferences` table.
 *
 * @remarks
 * Diet, allergies, and similar fields are edited on `/preferences` and used for AI
 * suggestion flows. On the new-recipe form, only `use_ai_assistance` is read from
 * this row — manual recipe fields are not shaped by these preferences.
 */
export const UserPreferencesSchema = z.object({
  created_at: supabaseTimestamptzSchema.nullable().optional(),
  updated_at: supabaseTimestamptzSchema.nullable().optional(),
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
  preferred_prep_time: z.string().optional().nullable(),
  /** Whether the user wants to use AI assistance for augmenting user recipes. */
  use_ai_assistance: z.boolean().optional().nullable()
});

/**
 * Permission flags on the `user_profiles` row.
 *
 * @remarks
 * Live preference data is in `user_preferences` ({@link UserPreferencesSchema}).
 * The `preferences` jsonb column on `user_profiles` is legacy and unused by
 * application code — keep it on this schema until the column is dropped in
 * Supabase so `safeParse` matches the table shape.
 */
export const UserProfileSchema = z.object({
  id: z.uuid(),
  /** Supabase user ID. */
  user_id: z.uuid(),
  /** Whether the user has access to AI assisted recipe generation. */
  ai_assistance: z.boolean(),
  /** Whether the user has access to cloud storage. */
  cloud_storage: z.boolean(),
  /**
   * Legacy jsonb on `user_profiles`; unused — do not read or write in application code.
   * @deprecated Remove when the Supabase column is dropped.
   */
  preferences: UserPreferencesSchema.optional()
    .nullable()
    .describe(
      'Legacy jsonb on `user_profiles`; unused — do not read or write in application code. @deprecated Remove when the Supabase column is dropped.'
    )
});

export const UserPreferencesRepsonseSchema = UserPreferencesSchema.extend({
  id: z.uuid().nullable().optional(),
  user_id: z.uuid(),
  created_at: supabaseTimestamptzSchema.nullable().optional(),
  updated_at: supabaseTimestamptzSchema.nullable().optional()
});
