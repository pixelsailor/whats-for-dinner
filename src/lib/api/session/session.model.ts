/**
 * @fileoverview Cookie-backed Supabase client factories for SSR and layout session wiring.
 * @module lib/api/session/session.model
 */

import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { SessionClientConfig, SessionCookieAdapter, SessionCookieStore } from './session.types';

/** Response headers Supabase session clients may emit that SvelteKit must pass through. */
export const SESSION_SERIALIZED_RESPONSE_HEADERS = ['content-range', 'x-supabase-api-version'] as const;

/**
 * Returns whether a response header name should be forwarded by SvelteKit SSR.
 * @param name - Header name from `filterSerializedResponseHeaders`
 */
export function isSessionSerializedResponseHeader(name: string): boolean {
  return (SESSION_SERIALIZED_RESPONSE_HEADERS as readonly string[]).includes(name);
}

/**
 * Default compile-time project configuration from public env vars.
 * @returns URL and publishable key loaded at build time
 */
export function getDefaultSessionClientConfig(): SessionClientConfig {
  return {
    url: PUBLIC_SUPABASE_URL,
    publishableKey: PUBLIC_SUPABASE_PUBLISHABLE_KEY
  };
}

/**
 * Per-request SSR client with cookie read/write.
 * Use in `hooks.server.ts` for `event.locals.supabase`, auth actions, and `safeGetSession`.
 * @param cookies - SvelteKit cookie adapter with `getAll` and `setAll`
 * @param config - Optional project override (defaults to public env)
 * @returns Cookie-backed `SupabaseClient` for authenticated server handlers
 */
export function createRequestServerClient(
  cookies: SessionCookieAdapter,
  config: SessionClientConfig = getDefaultSessionClientConfig()
): SupabaseClient {
  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (cookiesToSet) => cookies.setAll(cookiesToSet)
    }
  });
}

/**
 * Universal layout browser client.
 * Use in `+layout.ts` when `isBrowser()` is true.
 * @param fetch - SvelteKit `fetch` from the layout `load` event
 * @param config - Optional project override (defaults to public env)
 * @returns Browser `SupabaseClient` for layout consumers (`AuthService`, `CloudService`, `AccountService`)
 */
export function createLayoutBrowserClient(
  fetch: typeof globalThis.fetch,
  config: SessionClientConfig = getDefaultSessionClientConfig()
): SupabaseClient {
  return createBrowserClient(config.url, config.publishableKey, {
    global: { fetch }
  });
}

/**
 * Layout SSR branch client with read-only cookies.
 * Use in `+layout.ts` during SSR before hydration; trusted session comes from `+layout.server.ts`.
 * @param cookies - Read-only cookie store (typically `data.cookies` from the server layout)
 * @param fetch - SvelteKit `fetch` from the layout `load` event
 * @param config - Optional project override (defaults to public env)
 * @returns SSR `SupabaseClient` exposed as `data.supabase` on the server render path
 */
export function createLayoutServerClient(
  cookies: SessionCookieStore,
  fetch: typeof globalThis.fetch,
  config: SessionClientConfig = getDefaultSessionClientConfig()
): SupabaseClient {
  return createServerClient(config.url, config.publishableKey, {
    global: { fetch },
    cookies: {
      getAll: () => cookies.getAll()
    }
  });
}
