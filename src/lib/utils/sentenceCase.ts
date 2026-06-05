/**
 * @fileoverview Converts snake_case or lowercase strings to sentence case for display.
 * @module lib/utils/sentenceCase
 */

/**
 * Lowercases input, replaces underscores with spaces, and capitalizes word starts.
 * @param input - Raw label or enum-like string
 * @returns Human-readable sentence case text
 */
export function sentenceCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
