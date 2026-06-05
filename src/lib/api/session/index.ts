/**
 * Session client factory module.
 *
 * Wires cookie-backed Supabase clients at app boundaries (hooks, layout).
 * Domain services receive an injected `SupabaseClient` — they do not import this module.
 */

export * from './session.types';
export * from './session.model';
