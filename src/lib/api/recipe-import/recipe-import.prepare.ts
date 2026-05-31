/**
 * @fileoverview JSON-LD and HTML text preparation for recipe URL extraction.
 * @module lib/api/recipe-import/recipe-import.prepare
 */

import { RECIPE_IMPORT_NO_RECIPE, RecipeImportError } from './recipe-import.errors';
import type { FetchedPage, PreparedImportContent, PreparationSource } from './recipe-import.types';

/** Max characters for JSON-LD primary block in model input. */
export const PRIMARY_BLOCK_MAX_CHARS = 32_000;

/** Max characters for supplemental HTML text in model input. */
export const SUPPLEMENTAL_TEXT_MAX_CHARS = 64_000;

/** Minimum supplemental text for weak keyword-only detection (no section headings). */
const MIN_SUPPLEMENTAL_CHARS_WEAK_SIGNAL = 280;

/** Minimum supplemental text when ingredient and instruction sections are present. */
const MIN_SUPPLEMENTAL_CHARS_STRUCTURED = 120;

const JSON_LD_SCRIPT_RE =
  /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

/**
 * Builds {@link PreparedImportContent} from a fetched page or throws when no recipe signal exists.
 * @param page - Fetched HTML page
 * @returns Content for the extraction model
 * @throws {RecipeImportError} When the page has no extractable recipe signal
 */
export function prepareImportContent(page: FetchedPage): PreparedImportContent {
  const recipes = extractJsonLdRecipes(page.html);
  const primaryBlock = recipes.length > 0 ? truncate(stringifyPrimaryBlock(recipes[0]), PRIMARY_BLOCK_MAX_CHARS) : '';
  const supplementalText = truncate(htmlToText(page.html), SUPPLEMENTAL_TEXT_MAX_CHARS);

  if (!hasRecipeSignal(primaryBlock, supplementalText)) {
    throw new RecipeImportError(
      'No recipe was found on that page. The site may load the recipe only in a browser, or the page may block import.',
      RECIPE_IMPORT_NO_RECIPE,
      422
    );
  }

  const preparationSource = resolvePreparationSource(primaryBlock, supplementalText);

  return {
    sourceUrl: page.url,
    primaryBlock,
    supplementalText,
    preparationSource
  };
}

/**
 * @param primaryBlock - Serialized JSON-LD recipe
 * @param supplementalText - Stripped page text
 */
export function hasRecipeSignal(primaryBlock: string, supplementalText: string): boolean {
  if (primaryBlock.trim().length > 40) {
    return true;
  }

  const text = supplementalText.trim();

  if (text.length < MIN_SUPPLEMENTAL_CHARS_STRUCTURED) {
    return false;
  }

  const hasIngredientCue = /\bingredients?\b/i.test(text);
  const hasInstructionCue = /\b(instructions?|directions|method)\b/i.test(text);

  if (hasIngredientCue && hasInstructionCue) {
    return true;
  }

  if (text.length < MIN_SUPPLEMENTAL_CHARS_WEAK_SIGNAL) {
    return false;
  }

  return /ingredient|instruction|directions|preparation|servings|prep time|cook time|minutes|tablespoon|teaspoon|cup\b/i.test(
    text
  );
}

/**
 * @param html - Raw HTML document
 */
export function extractJsonLdRecipes(html: string): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  JSON_LD_SCRIPT_RE.lastIndex = 0;

  let match: RegExpExecArray | null;

  while ((match = JSON_LD_SCRIPT_RE.exec(html)) !== null) {
    const raw = match[1]?.trim();

    if (!raw) {
      continue;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }

    collectRecipeNodes(parsed, found);
  }

  return found;
}

/**
 * @param html - Raw HTML document
 */
export function htmlToText(html: string): string {
  let text = html;

  text = text.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  text = text.replace(/<!--[\s\S]*?-->/g, ' ');
  text = text.replace(/<\/(p|div|li|h[1-6]|br|tr)>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<[^>]+>/g, ' ');
  text = decodeBasicEntities(text);
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/[ \t]+\n/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]{2,}/g, ' ');

  return text.trim();
}

function collectRecipeNodes(node: unknown, out: Record<string, unknown>[]): void {
  if (!node) {
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collectRecipeNodes(item, out);
    }

    return;
  }

  if (typeof node !== 'object') {
    return;
  }

  const record = node as Record<string, unknown>;

  if (isRecipeType(record['@type'])) {
    out.push(record);
  }

  if (Array.isArray(record['@graph'])) {
    collectRecipeNodes(record['@graph'], out);
  }
}

/**
 * @param type - JSON-LD @type value
 */
function isRecipeType(type: unknown): boolean {
  if (typeof type === 'string') {
    return type === 'Recipe' || type.endsWith('/Recipe');
  }

  if (Array.isArray(type)) {
    return type.some((entry) => isRecipeType(entry));
  }

  return false;
}

/**
 * @param recipe - First JSON-LD recipe object
 */
function stringifyPrimaryBlock(recipe: Record<string, unknown>): string {
  return JSON.stringify(recipe);
}

/**
 * @param primaryBlock - JSON-LD excerpt
 * @param supplementalText - HTML text excerpt
 */
function resolvePreparationSource(primaryBlock: string, supplementalText: string): PreparationSource {
  const hasPrimary = primaryBlock.trim().length > 0;
  const supplemental = supplementalText.trim();
  const hasSupplemental =
    supplemental.length >= MIN_SUPPLEMENTAL_CHARS_WEAK_SIGNAL ||
    (/\bingredients?\b/i.test(supplemental) &&
      /\b(instructions?|directions|method)\b/i.test(supplemental) &&
      supplemental.length >= MIN_SUPPLEMENTAL_CHARS_STRUCTURED);

  if (hasPrimary && hasSupplemental) {
    return 'json_ld_and_html';
  }

  if (hasPrimary) {
    return 'json_ld';
  }

  return 'html_text';
}

/**
 * @param value - String to cap
 * @param max - Maximum length
 */
function truncate(value: string, max: number): string {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max)}\n…[truncated]`;
}

/**
 * @param text - Plain text with basic entities
 */
function decodeBasicEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}
