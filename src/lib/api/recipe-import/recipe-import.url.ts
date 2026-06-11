/**
 * @fileoverview URL validation and SSRF guards for recipe page fetch.
 * @module lib/api/recipe-import/recipe-import.url
 */

import {
  RECIPE_IMPORT_BLOCKED_URL,
  RECIPE_IMPORT_INVALID_URL,
  RecipeImportError
} from './recipe-import.errors';

/**
 * Parses and validates a user-supplied recipe URL for server-side fetch.
 * @param raw - URL string (may omit scheme; caller may normalize https first)
 * @returns Parsed URL with http or https scheme
 * @throws {RecipeImportError} When the URL is missing, invalid, or uses a disallowed scheme
 */
export function parseImportUrl(raw: string): URL {
  const trimmed = raw.trim();

  if (!trimmed) {
    throw new RecipeImportError(
      'A valid URL is required',
      RECIPE_IMPORT_INVALID_URL,
      400
    );
  }

  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    throw new RecipeImportError('Invalid URL', RECIPE_IMPORT_INVALID_URL, 400);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new RecipeImportError(
      'Only http and https URLs are supported',
      RECIPE_IMPORT_INVALID_URL,
      400
    );
  }

  if (!parsed.hostname) {
    throw new RecipeImportError('Invalid URL', RECIPE_IMPORT_INVALID_URL, 400);
  }

  assertPublicHostname(parsed.hostname);

  return parsed;
}

/**
 * Rejects hosts that must not be fetched from the server (SSRF mitigation).
 * @param url - Parsed import URL (re-checked after redirects)
 * @throws {RecipeImportError} When the host is private, local, or otherwise blocked
 */
export function assertPublicImportUrl(url: URL): void {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new RecipeImportError(
      'Only http and https URLs are supported',
      RECIPE_IMPORT_BLOCKED_URL,
      400
    );
  }

  assertPublicHostname(url.hostname);
}

/**
 * @param hostname - URL hostname (no port)
 */
function assertPublicHostname(hostname: string): void {
  const host = hostname.toLowerCase();

  if (host === 'localhost' || host.endsWith('.localhost')) {
    throw new RecipeImportError(
      'This URL cannot be imported',
      RECIPE_IMPORT_BLOCKED_URL,
      400
    );
  }

  if (
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    throw new RecipeImportError(
      'This URL cannot be imported',
      RECIPE_IMPORT_BLOCKED_URL,
      400
    );
  }

  if (host.includes('metadata.google') || host === 'metadata') {
    throw new RecipeImportError(
      'This URL cannot be imported',
      RECIPE_IMPORT_BLOCKED_URL,
      400
    );
  }

  if (isIpv4(host) && isPrivateOrReservedIpv4(host)) {
    throw new RecipeImportError(
      'This URL cannot be imported',
      RECIPE_IMPORT_BLOCKED_URL,
      400
    );
  }

  if (host.startsWith('[') && host.endsWith(']')) {
    const inner = host.slice(1, -1);

    if (
      inner === '::1' ||
      inner.startsWith('fe80:') ||
      inner.startsWith('fc') ||
      inner.startsWith('fd')
    ) {
      throw new RecipeImportError(
        'This URL cannot be imported',
        RECIPE_IMPORT_BLOCKED_URL,
        400
      );
    }
  }
}

function isIpv4(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

/**
 * @param host - IPv4 dotted quad
 */
function isPrivateOrReservedIpv4(host: string): boolean {
  const parts = host.split('.').map((p) => Number.parseInt(p, 10));

  if (parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }

  const [a, b] = parts;

  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;

  return false;
}
