/**
 * @fileoverview Supabase auth client wrapper for sign-in and session validation.
 * @module lib/api/auth/auth.service
 */
import type { Session, SupabaseClient } from '@supabase/supabase-js';
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
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
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
   * Clears locally cached auth state when JWT validation fails or session has expired.
   */
  async clearStaleSession(): Promise<void> {
    try {
      await this.supabase.auth.signOut({ scope: 'local' });
    } catch {
      try {
        await this.supabase.auth.signOut();
      } catch {
        // Ignore failure during local clearance
      }
    }
  }

  /**
   * Validates the session. If the session has expired or is invalid:
   * - If online, attempts a token refresh via `getUser()`.
   * - If refresh fails, or if offline, cleanly signs out locally and clears stale state.
   *
   * @param currentSession - Optional session to validate. If omitted, uses current Supabase session.
   * @returns `true` if session is valid or refreshed; `false` if expired or unauthenticated.
   */
  async validateOrSignOut(currentSession?: Session | null): Promise<boolean> {
    let session = currentSession;
    if (session === undefined) {
      const { data } = await this.supabase.auth.getSession();
      session = data.session;
    }

    if (!session) {
      return false;
    }

    const isExpired = session.expires_at
      ? session.expires_at * 1000 <= Date.now()
      : false;

    if (!isExpired) {
      return true;
    }

    // Access token is expired. If offline, cannot refresh -> sign out locally.
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await this.clearStaleSession();
      return false;
    }

    // Online: attempt to validate/refresh user session
    try {
      const {
        data: { user },
        error
      } = await this.supabase.auth.getUser();

      if (error || !user) {
        await this.clearStaleSession();
        return false;
      }

      return true;
    } catch {
      await this.clearStaleSession();
      return false;
    }
  }
}
