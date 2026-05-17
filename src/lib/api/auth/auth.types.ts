/**
 * Auth Types
 *
 * Types for authentication and authorization.
 *
 * These are backup types for the Supabase auth types. Avoid using these if Supabase types are available.
 */

import { z } from 'zod';
import type { SignInResponseSchema, SupabaseUserSchema } from './auth.schemas';

export type SupabaseUser = z.infer<typeof SupabaseUserSchema>;
export type SignInResponse = z.infer<typeof SignInResponseSchema>;
