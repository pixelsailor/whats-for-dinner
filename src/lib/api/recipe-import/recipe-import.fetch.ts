/**
 * @fileoverview Bounded HTTP fetch for recipe import pages.
 * @module lib/api/recipe-import/recipe-import.fetch
 */

import {
  RECIPE_IMPORT_FETCH_FAILED,
  RECIPE_IMPORT_NOT_HTML,
  RECIPE_IMPORT_PAGE_TOO_LARGE,
  RecipeImportError
} from './recipe-import.errors';
import type { FetchedPage } from './recipe-import.types';
import { assertPublicImportUrl } from './recipe-import.url';

/** Default fetch timeout per ADR-017. */
export const RECIPE_IMPORT_FETCH_TIMEOUT_MS = 10_000;

/** Maximum response body size (bytes). */
export const RECIPE_IMPORT_MAX_BYTES = 2 * 1024 * 1024;

const USER_AGENT = 'WhatsForDinner/1.0 (recipe-import; +https://github.com/whats-for-dinner)';

const MAX_REDIRECTS = 3;

/**
 * Fetches a recipe page with timeout, size cap, and validated redirects.
 * @param startUrl - Already validated public http(s) URL
 * @returns Page HTML and metadata
 * @throws {RecipeImportError} On network failure, oversize body, or blocked redirect target
 */
export async function fetchRecipePage(startUrl: URL): Promise<FetchedPage> {
  let current = startUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertPublicImportUrl(current);

    let response: Response;

    try {
      response = await fetch(current.href, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(RECIPE_IMPORT_FETCH_TIMEOUT_MS),
        headers: {
          Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          'User-Agent': USER_AGENT
        }
      });
    } catch {
      throw new RecipeImportError(
        'Could not reach that URL. Check the link and try again.',
        RECIPE_IMPORT_FETCH_FAILED,
        502
      );
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');

      if (!location || hop === MAX_REDIRECTS) {
        throw new RecipeImportError(
          'Could not reach that URL. Check the link and try again.',
          RECIPE_IMPORT_FETCH_FAILED,
          502
        );
      }

      current = new URL(location, current);
      continue;
    }

    if (!response.ok) {
      throw new RecipeImportError(
        'Could not load that page. The site may be blocking automated access.',
        RECIPE_IMPORT_FETCH_FAILED,
        502
      );
    }

    const contentType = response.headers.get('content-type');
    const html = await readResponseText(response);

    if (contentType && !contentType.toLowerCase().includes('text/html') && !looksLikeHtml(html)) {
      throw new RecipeImportError(
        'That URL did not return a web page. Try a link to a recipe article.',
        RECIPE_IMPORT_NOT_HTML,
        422
      );
    }

    return {
      url: current.href,
      contentType,
      html
    };
  }

  throw new RecipeImportError(
    'Could not reach that URL. Check the link and try again.',
    RECIPE_IMPORT_FETCH_FAILED,
    502
  );
}

/**
 * @param response - Fetch response with a body
 * @returns UTF-8 text capped at {@link RECIPE_IMPORT_MAX_BYTES}
 */
async function readResponseText(response: Response): Promise<string> {
  const reader = response.body?.getReader();

  if (!reader) {
    return '';
  }

  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    total += value.byteLength;

    if (total > RECIPE_IMPORT_MAX_BYTES) {
      await reader.cancel();
      throw new RecipeImportError('That page is too large to import', RECIPE_IMPORT_PAGE_TOO_LARGE, 413);
    }

    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder('utf-8', { fatal: false }).decode(merged);
}

/**
 * @param text - Response body
 */
function looksLikeHtml(text: string): boolean {
  const sample = text.slice(0, 4096).toLowerCase();

  return sample.includes('<html') || sample.includes('<!doctype');
}
