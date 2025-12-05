import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserPreferences, UserProfile } from './account.types';

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

  async getUserProfile() {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', this.userId)
      .single();

    if (error) throw error;

    return data;
  }

  async updateUser(updateData: Partial<UserProfile>) {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', this.userId)
      .select();

    if (error) throw error;

    return data;
  }

  /**
   * Check if the user has a specific permission.
   * 
   * @param permission - The permission to check.
   * @returns True if the user has the permission, false otherwise.
   */
  async hasPermission(permission: keyof UserProfile): Promise<boolean> {
    const { data, error }: { data: { [key in keyof UserProfile]: boolean } | null; error: Error | null } = await this.supabase
      .from('user_profiles')
      .select(permission)
      .eq('user_id', this.userId)
      .single();

    if (error) throw error;

    return data?.[permission] === true;
  }

  /**
   * Get the user's preferences.
   * 
   * @returns The user's preferences.
   */
  async getUserPreferences(): Promise<UserPreferences | null> {
    const { data, error }: { data: UserProfile | null; error: Error | null } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', this.userId)
      .single();

    if (error) throw error;

    return data?.preferences ?? null;
  }

  /**
   * Update the user's preferences.
   * 
   * @param updates - The updates to apply to the user's preferences.
   * @returns The updated user preferences.
   */
  async updateUserPreferences(updates: Partial<UserPreferences>) {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .update({ preferences: updates })
      .eq('user_id', this.userId)
      .select();

    if (error) throw error;

    return data;
  }
}
