import { describe, expect, it } from 'vitest';

import {
  RECIPE_IMPORT_BLOCKED_URL,
  RECIPE_IMPORT_INVALID_URL,
  RecipeImportError
} from './recipe-import.errors';
import { parseImportUrl } from './recipe-import.url';

describe('parseImportUrl', () => {
  it('accepts public https URLs', () => {
    const url = parseImportUrl('https://www.example.com/recipes/pasta');

    expect(url.hostname).toBe('www.example.com');
    expect(url.protocol).toBe('https:');
  });

  it('rejects non-http schemes', () => {
    expect(() => parseImportUrl('file:///etc/passwd')).toThrow(
      RecipeImportError
    );

    try {
      parseImportUrl('file:///etc/passwd');
    } catch (err) {
      expect((err as RecipeImportError).code).toBe(RECIPE_IMPORT_INVALID_URL);
    }
  });

  it('blocks localhost', () => {
    expect(() => parseImportUrl('http://localhost/recipe')).toThrow(
      RecipeImportError
    );

    try {
      parseImportUrl('http://localhost/recipe');
    } catch (err) {
      expect((err as RecipeImportError).code).toBe(RECIPE_IMPORT_BLOCKED_URL);
    }
  });

  it('blocks private IPv4 addresses', () => {
    expect(() => parseImportUrl('http://192.168.1.10/recipe')).toThrow(
      RecipeImportError
    );
    expect(() => parseImportUrl('http://127.0.0.1/recipe')).toThrow(
      RecipeImportError
    );
  });
});
