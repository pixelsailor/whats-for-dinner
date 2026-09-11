/**
 * @fileoverview Pure account helpers and Zod boundary parsers; no Supabase I/O.
 * @module lib/api/account/account.model
 */

import { z } from 'zod';

import {
  UserPreferencesRepsonseSchema,
  UserPreferencesSchema,
  UserProfileSchema
} from './account.schemas';
import type {
  UserPreferences,
  UserPreferencesResponse,
  UserProfile
} from './account.types';

export type { UserProfile, UserPreferences } from './account.types';

export { UserProfileSchema, UserPreferencesSchema } from './account.schemas';

/** Partial `user_profiles` row accepted by {@link AccountService.updateUser}. */
const UserProfileUpdateSchema = UserProfileSchema.partial();

/**
 * Partial `user_preferences` row accepted by {@link AccountService.updateUserPreferences}.
 * @remarks Uses {@link UserPreferencesRepsonseSchema} so `user_id` is validated for upsert.
 */
const UserPreferencesUpdateSchema = UserPreferencesRepsonseSchema.partial();

/** Thrown when Supabase row JSON fails Zod validation at the account service boundary. */
export class AccountParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountParseError';
  }
}

/**
 * @param result - Zod safeParse outcome
 * @param context - Label for logs and error messages
 * @returns Validated payload
 * @throws {AccountParseError} When validation fails
 */
function parseOrThrow<T>(result: z.ZodSafeParseResult<T>, context: string): T {
  if (!result.success) {
    console.error(
      `Account data validation failed for "${context}".`,
      result.error.flatten()
    );
    throw new AccountParseError(
      `Account data failed validation for "${context}".`
    );
  }

  return result.data;
}

/**
 * Validates a `user_profiles` row from Supabase.
 * @param data - Raw row from `.select()` / `.single()`
 * @returns Typed profile
 * @throws {AccountParseError} When the row does not match {@link UserProfileSchema}
 */
export function parseUserProfile(data: unknown): UserProfile {
  return parseOrThrow(UserProfileSchema.safeParse(data), 'user profile');
}

/**
 * Validates a partial profile update before writing to Supabase.
 * @param data - Fields to merge into `user_profiles`
 * @returns Typed update payload
 * @throws {AccountParseError} When fields are invalid
 */
export function parseUserProfileUpdate(data: unknown): Partial<UserProfile> {
  return parseOrThrow(
    UserProfileUpdateSchema.safeParse(data),
    'user profile update'
  );
}

/**
 * Validates one or more `user_profiles` rows returned from `.select()` after update.
 * @param data - Raw array from Supabase
 * @returns Typed profile rows
 * @throws {AccountParseError} When any row fails validation
 */
export function parseUserProfileRows(data: unknown): UserProfile[] {
  return parseOrThrow(
    z.array(UserProfileSchema).safeParse(data),
    'user profile rows'
  );
}

/**
 * Validates a `user_preferences` row from Supabase.
 * @param data - Raw row from `.select()` / `.maybeSingle()`
 * @returns Typed preferences row
 * @throws {AccountParseError} When the row does not match {@link UserPreferencesRepsonseSchema}
 */
export function parseUserPreferencesResponse(
  data: unknown
): UserPreferencesResponse {
  return parseOrThrow(
    UserPreferencesRepsonseSchema.safeParse(data),
    'user preferences'
  );
}

/**
 * Validates a partial preferences payload before upsert.
 * @param data - Preference fields (and optional metadata) to write
 * @returns Typed update payload
 * @throws {AccountParseError} When fields are invalid
 */
export function parseUserPreferencesUpdate(
  data: unknown
): Partial<UserPreferencesResponse> {
  return parseOrThrow(
    UserPreferencesUpdateSchema.safeParse(data),
    'user preferences update'
  );
}

/**
 * Validates `user_preferences` rows returned from `.select()` after upsert.
 * @param data - Raw array from Supabase
 * @returns Typed preference rows
 * @throws {AccountParseError} When any row fails validation
 */
export function parseUserPreferencesResponseRows(
  data: unknown
): UserPreferencesResponse[] {
  return parseOrThrow(
    z.array(UserPreferencesRepsonseSchema).safeParse(data),
    'user preferences rows'
  );
}

/** Boolean permission columns on `user_profiles` used for app gating. */
export type ProfilePermissionFlag =
  'ai_assistance' | 'read_cloud' | 'write_cloud';

/**
 * Returns true when the profile grants the given permission flag.
 * @param user - Validated user profile from {@link parseUserProfile} or {@link AccountService.getUserProfile}
 * @param permission - Permission column on `user_profiles`
 */
export function hasPermission(
  user: UserProfile,
  permission: ProfilePermissionFlag
): boolean {
  return user[permission] === true;
}
