/**
 * @fileoverview Typed errors for recipe URL import fetch and preparation.
 * @module lib/api/recipe-import/recipe-import.errors
 */

export const RECIPE_IMPORT_INVALID_URL = 'RECIPE_IMPORT_INVALID_URL';
export const RECIPE_IMPORT_BLOCKED_URL = 'RECIPE_IMPORT_BLOCKED_URL';
export const RECIPE_IMPORT_FETCH_FAILED = 'RECIPE_IMPORT_FETCH_FAILED';
export const RECIPE_IMPORT_PAGE_TOO_LARGE = 'RECIPE_IMPORT_PAGE_TOO_LARGE';
export const RECIPE_IMPORT_NO_RECIPE = 'RECIPE_IMPORT_NO_RECIPE';
export const RECIPE_IMPORT_NOT_HTML = 'RECIPE_IMPORT_NOT_HTML';

/**
 * Recoverable failure during fetch or preparation before calling the AI provider.
 */
export class RecipeImportError extends Error {
  /** Stable machine-oriented code for logging. */
  readonly code: string;
  /** Suggested HTTP status for API routes. */
  readonly httpStatus: number;

  /**
   * @param message - Safe user-facing error text
   * @param code - {@link RECIPE_IMPORT_INVALID_URL} and related constants
   * @param httpStatus - HTTP status for JSON API responses
   */
  constructor(message: string, code: string, httpStatus = 422) {
    super(message);
    this.name = 'RecipeImportError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}
