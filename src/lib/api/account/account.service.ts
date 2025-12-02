import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from './account.types';

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
}
