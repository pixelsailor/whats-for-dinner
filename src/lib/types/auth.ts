/**
 * Legacy Auth Types
 *
 * Legacy types for authentication and authorization.
 *
 * These types have been deprecated and may not be compatible with API service layers as defined in the `api` directory.
 */

/** @deprecated Use the `UserProfile` type from the `api/account` directory instead. */
export type User = {
  id: string;
  email: string;
  name: string;
  permissions: Permission[];
  isAuthenticated: boolean;
};

/** @deprecated There is no replacement for this type. */
export type Permission = {
  id: string;
  name: string;
  resource: string;
  action: string;
};

/**
 * Policy names for feature permissions.
 *
 * Values must match columns in the `user_profiles` table.
 */
/** @deprecated Prefer permissions from Supabase user profiles (`locals.permissions`). */
export type PolicyName = 'ai_assistance' | 'read_cloud' | 'write_cloud';

/**
 * Result of a feature permission check.
 *
 * @deprecated This may not have any practical use in the API service layer, but is useful for legacy code.
 */
export type PolicyResult = {
  allowed: boolean;
  reason?: string;
};
