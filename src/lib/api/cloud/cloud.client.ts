/**
 * @fileoverview Anonymous cloud client factory for server-only public reads (no session cookies).
 * @module lib/api/cloud/cloud.client
 */

import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { type SupabaseClient, createClient } from '@supabase/supabase-js';

/** Browser-safe Supabase project URL and publishable key pair. */
export type AnonymousCloudClientConfig = {
  url: string;
  publishableKey: string;
};

/**
 * Default compile-time project configuration from public env vars.
 * @returns URL and publishable key loaded at build time
 */
export function getDefaultAnonymousCloudClientConfig(): AnonymousCloudClientConfig {
  return {
    url: PUBLIC_SUPABASE_URL,
    publishableKey: PUBLIC_SUPABASE_PUBLISHABLE_KEY
  };
}

/**
 * Sessionless Supabase client for anonymous server-only cloud reads.
 * Use for public share-by-token and similar paths — not for login, sync, or user-scoped work.
 * @param config - Optional project override (defaults to public env)
 * @returns Standalone `SupabaseClient` without SSR cookie wiring
 */
export function createAnonymousCloudClient(
  config: AnonymousCloudClientConfig = getDefaultAnonymousCloudClientConfig()
): SupabaseClient {
  return createClient(config.url, config.publishableKey);
}
