import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockConversationCreate,
  mockConversationRetrieve,
  mockResponsesCreate
} = vi.hoisted(() => ({
  mockConversationCreate: vi.fn(),
  mockConversationRetrieve: vi.fn(),
  mockResponsesCreate: vi.fn()
}));

vi.mock('openai', () => ({
  OpenAI: class MockOpenAI {
    conversations = {
      create: mockConversationCreate,
      retrieve: mockConversationRetrieve
    };
    responses = { create: mockResponsesCreate };
  }
}));

vi.mock('$env/static/private', () => ({
  OPENAI_API_KEY: 'sk-test-key'
}));

import {
  SaimConversationContextError,
  askCookingQuestion,
  parseRecipeFromPageContent
} from './ai.server.service';
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

const savedRecipe = {
  ...JSON.parse(VALID_RECIPE_JSON),
  id: '11111111-1111-4111-8111-111111111111',
  created_at: '2026-09-08T12:00:00.000Z',
  updated_at: '2026-09-08T12:00:00.000Z',
  archived: null,
  deleted_at: null,
  last_opened: null,
  version: 1,
  parent_id: null,
  is_current: true,
  is_favorite: null,
  owner_id: '22222222-2222-4222-8222-222222222222',
  shared_id: null,
  synced: false,
  last_synced_at: null,
  sync_error: null,
  checkout_history: null
};

const conversationContext = {
  pathname: '/recipes/11111111-1111-4111-8111-111111111111',
  recipe: savedRecipe,
  userId: '22222222-2222-4222-8222-222222222222'
};

const conversationMetadata = {
  purpose: 'saim_recipe_assistance',
  user_id: conversationContext.userId,
  recipe_id: savedRecipe.id,
  page_path: conversationContext.pathname
};

describe('parseRecipeFromPageContent', () => {
  beforeEach(() => {
    mockResponsesCreate.mockReset();
    mockResponsesCreate.mockResolvedValue({ output_text: VALID_RECIPE_JSON });
  });

  it('sends primary block and sanitized body in model input, not URL-only', async () => {
    await parseRecipeFromPageContent(prepared, prepared.sourceUrl);

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
    expect(call.input).toContain('--- SUPPLEMENTAL BODY (sanitized HTML) ---');
    expect(call.input).toContain('<article>');
    expect(call.input).not.toMatch(/^The URL is:/m);
  });

  it('does not inject user dietary preferences into extraction instructions', async () => {
    await parseRecipeFromPageContent(prepared, prepared.sourceUrl);

    const call = mockResponsesCreate.mock.calls[0]?.[0] as {
      instructions: string;
    };

    expect(call.instructions).not.toContain(
      'preferences and dietary restrictions'
    );
    expect(call.instructions).toContain('recipe extraction assistant');
  });
});

describe('askCookingQuestion', () => {
  beforeEach(() => {
    mockConversationCreate.mockReset();
    mockConversationRetrieve.mockReset();
    mockResponsesCreate.mockReset();
    mockConversationCreate.mockResolvedValue({
      id: 'conv_first',
      metadata: conversationMetadata
    });
    mockConversationRetrieve.mockResolvedValue({
      id: 'conv_existing',
      metadata: conversationMetadata
    });
    mockResponsesCreate.mockResolvedValue({
      output_text: JSON.stringify({ answer: 'Use medium heat.', recipe: null })
    });
  });

  it('creates and seeds a recipe-scoped conversation on the first turn', async () => {
    const result = await askCookingQuestion({
      question: 'How hot should the pan be?',
      context: conversationContext
    });

    expect(mockConversationCreate).toHaveBeenCalledOnce();
    expect(mockConversationCreate).toHaveBeenCalledWith({
      metadata: conversationMetadata,
      items: [
        expect.objectContaining({
          role: 'developer',
          content: expect.stringContaining('Weeknight Pasta')
        })
      ]
    });
    expect(mockResponsesCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation: 'conv_first',
        input: 'How hot should the pan be?'
      })
    );
    expect(result).toEqual({
      outputText: JSON.stringify({
        answer: 'Use medium heat.',
        recipe: null
      }),
      conversationId: 'conv_first'
    });
  });

  it('reuses a verified conversation and appends an updated recipe snapshot', async () => {
    await askCookingQuestion({
      question: 'Does that change the cooking time?',
      context: {
        ...conversationContext,
        recipe: {
          ...savedRecipe,
          title: 'Updated Weeknight Pasta',
          version: 2
        }
      },
      conversationId: 'conv_existing',
      recipeContextChanged: true
    });

    expect(mockConversationCreate).not.toHaveBeenCalled();
    expect(mockConversationRetrieve).toHaveBeenCalledWith('conv_existing');

    const responseRequest = mockResponsesCreate.mock.calls[0]?.[0] as {
      input: Array<{ role: string; content: string }>;
    };
    expect(responseRequest.input[0]).toEqual(
      expect.objectContaining({
        role: 'developer',
        content: expect.stringContaining('Updated Weeknight Pasta')
      })
    );
    expect(responseRequest.input[1]).toEqual({
      type: 'message',
      role: 'user',
      content: 'Does that change the cooking time?'
    });
  });

  it('rejects a conversation bound to another user or page', async () => {
    mockConversationRetrieve.mockResolvedValue({
      id: 'conv_existing',
      metadata: {
        ...conversationMetadata,
        user_id: '33333333-3333-4333-8333-333333333333'
      }
    });

    await expect(
      askCookingQuestion({
        question: 'Can I substitute butter?',
        context: conversationContext,
        conversationId: 'conv_existing'
      })
    ).rejects.toBeInstanceOf(SaimConversationContextError);
    expect(mockResponsesCreate).not.toHaveBeenCalled();
  });
});
