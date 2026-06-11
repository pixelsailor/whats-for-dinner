import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/api/recipe-import/recipe-import.service', () => ({
  fetchAndPrepareRecipeImport: vi.fn()
}));

vi.mock('$lib/api/ai/ai.server.service', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('$lib/api/ai/ai.server.service')>();
  return {
    ...actual,
    importRecipeFromURL: vi.fn()
  };
});

import { importRecipeFromURL } from '$lib/api/ai/ai.server.service';
import {
  RECIPE_IMPORT_NO_RECIPE,
  RecipeImportError
} from '$lib/api/recipe-import/recipe-import.errors';
import { fetchAndPrepareRecipeImport } from '$lib/api/recipe-import/recipe-import.service';

import { POST } from './+server';

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

const prepared = {
  sourceUrl: 'https://example.com/pasta',
  primaryBlock: '{"@type":"Recipe","name":"Weeknight Pasta"}',
  sanitizedBodyContent: '<article><h2>Ingredients</h2></article>',
  preparationSource: 'json_ld' as const
};

function createEvent(
  body: unknown,
  permissions: { ai_assistance?: boolean } = { ai_assistance: true }
) {
  return {
    request: new Request('http://localhost/api/import/url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }),
    locals: { permissions }
  } as Parameters<typeof POST>[0];
}

describe('POST /api/import/url', () => {
  beforeEach(() => {
    vi.mocked(fetchAndPrepareRecipeImport).mockReset();
    vi.mocked(importRecipeFromURL).mockReset();
  });

  it('returns 400 when body is invalid', async () => {
    const response = await POST(createEvent({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      data: null,
      error: 'A valid URL is required'
    });
  });

  it('rejects strict body with extra client-supplied HTML fields', async () => {
    const response = await POST(
      createEvent({
        url: 'https://example.com/recipe',
        html: '<article>client html</article>'
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      data: null,
      error: 'A valid URL is required'
    });
  });

  it('returns 403 when AI permission is missing', async () => {
    const response = await POST(
      createEvent(
        { url: 'https://example.com/recipe' },
        { ai_assistance: false }
      )
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      success: false,
      data: null,
      error: 'AI access denied'
    });
  });

  it('returns validated recipe on success', async () => {
    vi.mocked(fetchAndPrepareRecipeImport).mockResolvedValue(prepared);
    vi.mocked(importRecipeFromURL).mockResolvedValue(VALID_RECIPE_JSON);

    const response = await POST(
      createEvent({ url: 'https://example.com/pasta' })
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.success).toBe(true);
    expect(payload.data.title).toBe('Weeknight Pasta');
    expect(importRecipeFromURL).toHaveBeenCalledWith(
      prepared.sourceUrl,
      prepared
    );
  });

  it('runs server fetch/prepare before AI extraction', async () => {
    const callOrder: string[] = [];

    vi.mocked(fetchAndPrepareRecipeImport).mockImplementation(async () => {
      callOrder.push('prepare');
      return prepared;
    });
    vi.mocked(importRecipeFromURL).mockImplementation(async () => {
      callOrder.push('ai');
      return VALID_RECIPE_JSON;
    });

    await POST(createEvent({ url: 'https://example.com/pasta' }));

    expect(callOrder).toEqual(['prepare', 'ai']);
    expect(fetchAndPrepareRecipeImport).toHaveBeenCalledWith(
      'https://example.com/pasta'
    );
  });

  it('returns preparation failure with stable error shape', async () => {
    vi.mocked(fetchAndPrepareRecipeImport).mockRejectedValue(
      new RecipeImportError(
        'No recipe was found on that page.',
        RECIPE_IMPORT_NO_RECIPE,
        422
      )
    );

    const response = await POST(
      createEvent({ url: 'https://example.com/empty' })
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      success: false,
      data: null,
      error: 'No recipe was found on that page.'
    });
    expect(importRecipeFromURL).not.toHaveBeenCalled();
  });
});
