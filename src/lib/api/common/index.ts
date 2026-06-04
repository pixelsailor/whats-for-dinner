/**
 * @fileoverview Public barrel for cross-domain API types and schemas.
 * @module lib/api/common
 *
 * @remarks Supabase clients are **not** exported from this module. Use `locals.supabase`,
 * layout `data.supabase`, or constructor-injected `SupabaseClient` in domain services.
 * See `common/README.md`.
 */
export * from './common.schemas';
export * from './common.types';
