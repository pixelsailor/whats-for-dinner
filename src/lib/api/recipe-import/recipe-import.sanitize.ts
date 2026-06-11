/**
 * @fileoverview DOMPurify sanitization of fetched recipe page HTML for AI supplemental input.
 * @module lib/api/recipe-import/recipe-import.sanitize
 */

import DOMPurify from 'isomorphic-dompurify';

/** Result of server-side HTML sanitization for recipe import. */
export interface SanitizedPageBody {
  /** DOMPurify-sanitized document body innerHTML for model supplemental input. */
  sanitizedBodyHtml: string;
  /** Plain text from sanitized body (for heuristics only, not sent as primary AI block). */
  bodyText: string;
}

/**
 * Parses HTML in a JSDOM window, sanitizes with DOMPurify, returns body fragments.
 * @param html - Raw fetched page HTML (UTF-8, already size-capped by fetch)
 * @returns Sanitized body HTML and text; empty strings when no body element
 * @remarks Server-only — import only from `recipe-import.prepare` or tests.
 */
export function sanitizeRecipePageBody(html: string): SanitizedPageBody {
  try {
    const dom = DOMPurify.sanitize(html, { RETURN_DOM: true });

    if (!dom || typeof dom !== 'object' || !('innerHTML' in dom)) {
      return { sanitizedBodyHtml: '', bodyText: '' };
    }

    const body = dom as HTMLElement;

    return {
      sanitizedBodyHtml: body.innerHTML,
      bodyText: body.textContent ?? ''
    };
  } catch {
    return { sanitizedBodyHtml: '', bodyText: '' };
  }
}
