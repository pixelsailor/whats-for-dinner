/**
 * @fileoverview Orchestrates fetch and preparation for recipe URL import (ADR-017).
 * @module lib/api/recipe-import/recipe-import.service
 */

import { fetchRecipePage } from './recipe-import.fetch';
import { prepareImportContent } from './recipe-import.prepare';
import type { PreparedImportContent } from './recipe-import.types';
import { parseImportUrl } from './recipe-import.url';

/**
 * Validates URL, fetches the page, and prepares model input. Does not call the AI provider.
 * @param urlString - User-provided recipe page URL (http/https)
 * @returns Prepared content for extraction
 * @throws {RecipeImportError} On invalid URL, fetch failure, or missing recipe signal
 */
export async function fetchAndPrepareRecipeImport(
  urlString: string
): Promise<PreparedImportContent> {
  const url = parseImportUrl(urlString);
  const page = await fetchRecipePage(url);

  return prepareImportContent(page);
}
