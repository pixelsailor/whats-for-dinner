/**
 * Auth Types
 *
 * Types for authentication and authorization.
 *
 * These are backup types for the Supabase auth types. Avoid using these if Supabase types are available.
 */

import type { Session, User } from '@supabase/supabase-js';
import { z } from 'zod';
import type { SignInResponseSchema, SupabaseUserSchema } from './auth.schemas';

export type SupabaseUser = z.infer<typeof SupabaseUserSchema>;
export type SignInResponse = z.infer<typeof SignInResponseSchema>;

/** Session and user pair returned after JWT validation. */
export type ValidatedSession = {
  session: Session | null;
  user: User | null;
};

/** Permission booleans cached in the httpOnly `wfd-permissions` cookie after login. */
export type PermissionFlags = {
  ai_assistance: boolean;
  read_cloud: boolean;
  write_cloud: boolean;
};
