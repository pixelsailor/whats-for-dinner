import type { z } from 'zod';
import type { UserProfileSchema, UserPreferencesSchema } from './account.schemas';

export type UserProfile = z.infer<typeof UserProfileSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
