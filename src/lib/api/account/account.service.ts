/**
 * @fileoverview Supabase account I/O with Zod validation at read/write boundaries.
 * @module lib/api/account/account.service
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import {
  parseUserPreferencesResponse,
  parseUserPreferencesResponseRows,
  parseUserPreferencesUpdate,
  parseUserProfile,
  parseUserProfileRows,
  parseUserProfileUpdate
} from './account.model';
import type { UserPreferencesResponse, UserProfile } from './account.types';

/**
 * Account Service
 *
 * Handles account management, permissions, and user preferences.
 * Account Service is available to all signed in users.
 *
 * @example
 * ```typescript
 * // +page.server.ts
 * import type { PageServerLoad } from './$types';
 * import { AccountService } from '$lib/api/account/account.service';
 *
 * export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
 *   const { user } = await safeGetSession();
 *   if (!user) {
 *     return { error: 'Unauthorized' };
 *   }
 *   const accountService = new AccountService(supabase, user.id);
 *   return { accountService };
 * };
 * ```
 */
export class AccountService {
  private supabase: SupabaseClient;
  private userId: string;

  constructor(supabase: SupabaseClient, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
  }

  /**
   * Loads the signed-in user's `user_profiles` row.
   * @returns Validated profile
   * @throws Supabase or {@link AccountParseError} when the row is missing or invalid
   */
  async getUserProfile(): Promise<UserProfile> {
    const { data, error } = await this.supabase.from('user_profiles').select('*').eq('user_id', this.userId).single();

    if (error) throw error;

    return parseUserProfile(data);
  }

  /**
   * Updates permission fields on `user_profiles`.
   * @param updateData - Partial profile fields to persist
   * @returns Validated rows returned from `.select()`
   * @throws Supabase or {@link AccountParseError} on failure or invalid response
   */
  async updateUser(updateData: Partial<UserProfile>): Promise<UserProfile[]> {
    const validatedUpdate = parseUserProfileUpdate(updateData);

    const { data, error } = await this.supabase
      .from('user_profiles')
      .update(validatedUpdate)
      .eq('user_id', this.userId)
      .select();

    if (error) throw error;

    return parseUserProfileRows(data);
  }

  /**
   * Get the user's preferences.
   *
   * @returns The user's preferences, or null when no row exists
   * @throws Supabase or {@link AccountParseError} when the row is invalid
   */
  async getUserPreferences(): Promise<UserPreferencesResponse | null> {
    const { data, error } = await this.supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', this.userId)
      .maybeSingle();

    if (error) throw error;
    if (data === null) return null;

    return parseUserPreferencesResponse(data);
  }

  /**
   * Update the user's preferences.
   *
   * @note The `onConflict` parameter is used to prevent duplicate entries for the same user.
   * @param preferences - The updates to apply to the user's preferences.
   * @returns Validated preference rows returned from `.select()`
   * @throws Supabase or {@link AccountParseError} on failure or invalid response
   */
  async updateUserPreferences(preferences: Partial<UserPreferencesResponse>): Promise<UserPreferencesResponse[]> {
    const validatedPreferences = parseUserPreferencesUpdate(preferences);

    const { data, error } = await this.supabase
      .from('user_preferences')
      .upsert(validatedPreferences, { onConflict: 'user_id' })
      .eq('user_id', this.userId)
      .select();

    if (error) throw error;

    return parseUserPreferencesResponseRows(data);
  }
}
