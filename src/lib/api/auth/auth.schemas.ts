/**
 * Auth Schemas
 * 
 * Zod schemas for authentication and authorization.
 * 
 * These are backup schemas for the Supabase auth types. Avoid using these if Supabase types are available.
 */

import { z } from "zod";

export const SupabaseUserSchema = z.object({
  app_metadata: z.object({
    provider: z.string().optional(),
    providers: z.array(z.string()).optional(),
  }),
  aud: z.string(),
  created_at: z.iso.datetime(),
  id: z.string(),
  user_metadata: z.any(),
  email: z.string().optional(),
  email_change_sent_at: z.string().optional(),
  email_confirmed_at: z.string().optional(),
  identities: z.array(z.object({
    id: z.string(),
    provider: z.string(),
  })).optional(),
  last_sign_in_at: z.string().optional(),
  new_email: z.string().optional(),
  phone: z.string().optional(),
  phone_confirmed_at: z.string().optional(),
  role: z.string().optional(),
  updated_at: z.string().optional()
});

export const SignInResponseSchema = z.object({
  data: z.object({
    session: z.object({
      access_token: z.string(),
      expires_in: z.number(),
      refresh_token: z.string(),
      token_type: z.string(),
      user: SupabaseUserSchema,
      expires_at: z.number().optional(),
      provider_token: z.string().optional(),
      provider_refresh_token: z.string().optional().nullable(),
    }),
    user: SupabaseUserSchema,
    weakPassword: z.object({
      message: z.string(),
      reasons: z.array(z.string()),
    }).optional(),
  }),
});
