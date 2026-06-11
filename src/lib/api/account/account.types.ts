import type { z } from 'zod';
import type {
  UserPreferencesRepsonseSchema,
  UserPreferencesSchema,
  UserProfileSchema
} from './account.schemas';

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type UserPreferencesResponse = z.infer<
  typeof UserPreferencesRepsonseSchema
>;
