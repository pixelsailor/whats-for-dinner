/**
 * Types for cookie-backed Supabase session client factories.
 */

/** Browser-safe Supabase project URL and publishable key pair. */
export type SessionClientConfig = {
  /** Supabase project URL (`PUBLIC_SUPABASE_URL`). */
  url: string;
  /** Browser-safe publishable key (`PUBLIC_SUPABASE_PUBLISHABLE_KEY`). */
  publishableKey: string;
};

/** Cookie name/value pair used by `@supabase/ssr` session adapters. */
export type SessionCookie = {
  name: string;
  value: string;
};

/** Cookie options emitted by Supabase when refreshing auth tokens. */
export type SessionCookieOptions = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

/** Read-only cookie adapter for layout SSR (session read, no token refresh writes). */
export type SessionCookieStore = {
  /** Returns all auth-related cookies for the current request. */
  getAll: () => SessionCookie[];
};

/**
 * Full cookie adapter for per-request SSR handlers.
 * Supports `setAll` so Supabase can persist refreshed session tokens.
 */
export type SessionCookieAdapter = SessionCookieStore & {
  setAll: (cookies: SessionCookieOptions[]) => void;
};
