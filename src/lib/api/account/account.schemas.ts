/**
 * User account information and permissions.
 */

import { z } from 'zod';

/**
 * User preferences for recipe suggestions and instructions.
 */
export const UserPreferencesSchema = z.object({
  /** Dietary restrictions or preferences (e.g., ['vegetarian']). */
  diet: z.array(z.string()).optional(),
  /** Allergies the user has (e.g., ['peanuts']). */
  allergies: z.array(z.string()).optional(),
  /** Ingredients the user dislikes. */
  dislikes: z.array(z.string()).optional(),
  /** Preferred cuisines (e.g., ['italian']). */
  cuisine_preferences: z.array(z.string()).optional(),
  /** Available equipment (e.g., ['oven','instant-pot']). */
  equipment: z.array(z.string()).optional(),
  /** Skill level to tune suggestions or instructions. */
  skill_level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  /** Preferred prep time bucket. */
  preferred_prep_time: z.enum(['under 30 minutes', '30-60 minutes', 'no time limit']).optional(),
});

/**
 * User account information and permissions.
 */
export const UserProfileSchema = z.object({
  id: z.uuid(),
  /** Supabase user ID. */
  user_id: z.uuid(),
  /** Whether the user has access to AI assisted recipe generation. */
  aiAssistance: z.boolean(),
  /** Whether the user has access to cloud storage. */
  cloudSync: z.boolean(),
  /** User preferences. */
  preferences: UserPreferencesSchema,
});
