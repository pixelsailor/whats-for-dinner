/**
 * Account Management Models
 */

export type { UserProfile, UserPreferences } from './account.types';

export { UserProfileSchema, UserPreferencesSchema } from './account.schemas';

import type { UserProfile } from './account.types';

/**
 * Check if the user has a specific permission.
 * 
 * @param user - The user profile.
 * @param permission - The permission to check.
 * @returns True if the user has the permission, false otherwise.
 */
export function hasPermission(user: UserProfile, permission: keyof UserProfile): boolean {
  return user[permission] === true;
}
