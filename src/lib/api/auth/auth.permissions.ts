/**
 * @fileoverview Reads and writes httpOnly permission flags cached after login.
 * @module lib/api/auth/auth.permissions
 */
import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';

import type { PermissionFlags } from './auth.types';

const PERMISSIONS_COOKIE = 'wfd-permissions';
const PERMISSIONS_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const cookieOptions = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: !dev,
  maxAge: PERMISSIONS_MAX_AGE
};

/**
 * Type guard for the permission cookie payload shape.
 * @param value - Parsed JSON from the cookie
 */
function isPermissionFlags(value: unknown): value is PermissionFlags {
  if (!value || typeof value !== 'object') return false;
  const flags = value as Record<string, unknown>;
  return typeof flags.ai_assistance === 'boolean' && typeof flags.cloud_storage === 'boolean';
}

/**
 * Returns cached permission flags from the httpOnly session cookie.
 * @param cookies - SvelteKit request cookies
 * @returns Parsed flags, or null when missing or invalid
 */
export function getSessionPermissions(cookies: Cookies): PermissionFlags | null {
  const raw = cookies.get(PERMISSIONS_COOKIE);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return isPermissionFlags(parsed) ? parsed : null;
  } catch (error) {
    console.error('Failed to parse permissions cookie', error);
    return null;
  }
}

/**
 * Persists permission flags in the httpOnly session cookie after login.
 * @param cookies - SvelteKit response cookies
 * @param permissions - Profile-derived `ai_assistance` and `cloud_storage` flags
 */
export function setSessionPermissions(cookies: Cookies, permissions: PermissionFlags): void {
  cookies.set(PERMISSIONS_COOKIE, JSON.stringify(permissions), cookieOptions);
}

/**
 * Removes the permission cookie on logout or when profile lookup fails.
 * @param cookies - SvelteKit response cookies
 */
export function clearSessionPermissions(cookies: Cookies): void {
  cookies.delete(PERMISSIONS_COOKIE, { path: cookieOptions.path });
}
