/**
 * @fileoverview Types for server-side recipe URL fetch and content preparation.
 * @module lib/api/recipe-import/recipe-import.types
 */

/** How recipe content was derived from the fetched page. */
export type PreparationSource = 'json_ld' | 'html_text' | 'json_ld_and_html';

/**
 * Normalized page content passed to the extraction model.
 * @remarks The model input must include this object; a URL string alone is insufficient (ADR-017).
 */
export interface PreparedImportContent {
  /** Canonical recipe page URL. */
  sourceUrl: string;
  /** JSON-LD Recipe block or empty when only HTML text is available. */
  primaryBlock: string;
  /** Stripped visible page text excerpt. */
  supplementalText: string;
  /** Which preparation paths contributed content. */
  preparationSource: PreparationSource;
}

/**
 * Result of a bounded HTTP fetch of a recipe page.
 */
export interface FetchedPage {
  /** Final URL after redirects (when followed). */
  url: string;
  /** Response Content-Type header, if present. */
  contentType: string | null;
  /** Response body interpreted as UTF-8 text (truncated to fetch cap). */
  html: string;
}
