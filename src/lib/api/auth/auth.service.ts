/**
 * Auth Service
 *
 * Handles authentication and authorization for the application.
 *
 * **Auth Service** is a wrapper for the Supabase auth client. It is highly redundant and should be
 * avoided if possible. Prefer using the Supabase auth client directly.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export class AuthService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async signInWithEmail(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async changePassword(password: string) {
    const { data, error } = await this.supabase.auth.updateUser({ password });
    if (error) throw error;
    return data;
  }
}
