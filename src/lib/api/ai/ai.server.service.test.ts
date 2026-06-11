import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockResponsesCreate } = vi.hoisted(() => ({
  mockResponsesCreate: vi.fn()
}));

vi.mock('openai', () => ({
  OpenAI: class MockOpenAI {
    responses = { create: mockResponsesCreate };
  }
}));

vi.mock('$env/static/private', () => ({
  OPENAI_API_KEY: 'sk-test-key'
}));

import { importRecipeFromURL } from './ai.server.service';
import type { PreparedImportContent } from '$lib/api/recipe-import/recipe-import.types';

const VALID_RECIPE_JSON = JSON.stringify({
  title: 'Weeknight Pasta',
  short_description: 'Quick garlic pasta.',
  description: 'A simple weeknight pasta with garlic and olive oil.',
  ingredients: '- 8 oz pasta\n- 2 tbsp olive oil',
  instructions: '1. Boil pasta.\n2. Toss with garlic oil.',
  tags: ['dinner', 'main'],
  yield: '4 servings',
  prep_time: ['10'],
  cook_time: ['20'],
  notes: null
});

const prepared: PreparedImportContent = {
  sourceUrl: 'https://example.com/pasta',
  primaryBlock: '{"@type":"Recipe","name":"Weeknight Pasta"}',
  sanitizedBodyContent:
    '<article><h2>Ingredients</h2><ul><li>8 oz pasta</li></ul></article>',
  preparationSource: 'json_ld_and_html'
};

describe('importRecipeFromURL', () => {
  beforeEach(() => {
    mockResponsesCreate.mockReset();
    mockResponsesCreate.mockResolvedValue({ output_text: VALID_RECIPE_JSON });
  });

  it('sends primary block and sanitized body in model input, not URL-only', async () => {
    await importRecipeFromURL(prepared.sourceUrl, prepared);

    expect(mockResponsesCreate).toHaveBeenCalledOnce();

    const call = mockResponsesCreate.mock.calls[0]?.[0] as {
      input: string;
      instructions: string;
    };

    expect(call.input).toContain('Source URL: https://example.com/pasta');
    expect(call.input).toContain(
      '--- PRIMARY SOURCE (JSON-LD Recipe; prefer this) ---'
    );
    expect(call.input).toContain('Weeknight Pasta');
    expect(call.input).toContain(
      '--- SUPPLEMENTAL BODY (sanitized HTML) ---'
    );
    expect(call.input).toContain('<article>');
    expect(call.input).not.toMatch(/^The URL is:/m);
  });

  it('does not inject user dietary preferences into extraction instructions', async () => {
    await importRecipeFromURL(prepared.sourceUrl, prepared);

    const call = mockResponsesCreate.mock.calls[0]?.[0] as {
      instructions: string;
    };

    expect(call.instructions).not.toContain(
      'preferences and dietary restrictions'
    );
    expect(call.instructions).toContain('recipe extraction assistant');
  });
});
