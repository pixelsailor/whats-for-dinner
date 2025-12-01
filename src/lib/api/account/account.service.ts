/**
 * Account Service
 * 
 * Handles account management, permissions, and user preferences.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from './account.types';

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
}
