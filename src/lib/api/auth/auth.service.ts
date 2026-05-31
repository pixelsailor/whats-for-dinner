/**
 * @fileoverview Supabase auth client wrapper for sign-in and session validation.
 * @module lib/api/auth/auth.service
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ValidatedSession } from './auth.types';

/**
 * Supabase auth operations used at login and session boundaries.
 */
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

  /**
   * Returns a session only when the access token passes JWT validation.
   * @returns Validated session and user, or nulls when unauthenticated or the JWT is invalid
   * @remarks Unlike `getSession()`, this does not trust cached local session state alone.
   */
  async getValidatedSession(): Promise<ValidatedSession> {
    const {
      data: { session }
    } = await this.supabase.auth.getSession();

    if (!session) {
      return { session: null, user: null };
    }

    const {
      data: { user },
      error
    } = await this.supabase.auth.getUser();

    if (error || !user) {
      return { session: null, user: null };
    }

    return { session, user };
  }

  /**
   * Clears locally cached auth state when JWT validation fails but getSession still returns data.
   */
  async clearStaleSession(): Promise<void> {
    const {
      data: { session }
    } = await this.supabase.auth.getSession();

    if (session) {
      await this.supabase.auth.signOut();
    }
  }
}
