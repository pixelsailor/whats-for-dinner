import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockAskCookingQuestion } = vi.hoisted(() => ({
  mockAskCookingQuestion: vi.fn()
}));

vi.mock('./ai.server.service', () => {
  class SaimConversationContextError extends Error {}

  return {
    OPENAI_DISABLED_ERROR: 'OPENAI_DISABLED',
    SaimConversationContextError,
    askCookingQuestion: mockAskCookingQuestion
  };
});

import { askSaimAction } from './asksaim.action';
import { SaimConversationContextError } from './ai.server.service';

const recipe = {
  title: 'Weeknight Pasta',
  short_description: 'Quick garlic pasta.',
  description: 'A simple weeknight pasta with garlic and olive oil.',
  ingredients: '- 8 oz pasta\n- 2 tbsp olive oil',
  instructions: '1. Boil pasta.\n2. Toss with garlic oil.',
  tags: ['dinner', 'main'],
  yield: '4 servings',
  prep_time: ['10'],
  cook_time: ['20'],
  notes: null,
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

/**
 * Builds the minimal RequestEvent fields consumed by the shared action.
 * @param fields - Form fields to submit
 * @returns Request event accepted by `askSaimAction`
 */
function createEvent(fields: Record<string, string>) {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    formData.set(key, value);
  });

  return {
    request: new Request('https://wfd.test/recipes/recipe-id?/asksaim', {
      method: 'POST',
      body: formData
    }),
    locals: {
      session: {
        user: {
          id: '22222222-2222-4222-8222-222222222222'
        }
      },
      permissions: {
        ai_assistance: true
      }
    },
    url: new URL('https://wfd.test/recipes/recipe-id')
  } as Parameters<typeof askSaimAction>[0];
}

describe('askSaimAction', () => {
  beforeEach(() => {
    mockAskCookingQuestion.mockReset();
    mockAskCookingQuestion.mockResolvedValue({
      outputText: JSON.stringify({
        answer: 'Use medium heat.',
        recipe: null
      }),
      conversationId: 'conv_first'
    });
  });

  it('forwards trusted page context and returns the conversation id', async () => {
    const result = await askSaimAction(
      createEvent({
        help_input: 'How hot should the pan be?',
        recipe: JSON.stringify(recipe),
        conversation_id: 'conv_existing',
        recipe_context_changed: 'true'
      })
    );

    expect(mockAskCookingQuestion).toHaveBeenCalledWith({
      question: 'How hot should the pan be?',
      context: {
        pathname: '/recipes/recipe-id',
        recipe,
        userId: '22222222-2222-4222-8222-222222222222'
      },
      conversationId: 'conv_existing',
      recipeContextChanged: true
    });
    expect(result).toEqual({
      answer: 'Use medium heat.',
      conversationId: 'conv_first'
    });
  });

  it('rejects malformed recipe JSON before calling OpenAI', async () => {
    const result = await askSaimAction(
      createEvent({
        help_input: 'Can I swap the oil?',
        recipe: '{not-json}',
        conversation_id: '',
        recipe_context_changed: 'false'
      })
    );

    expect(mockAskCookingQuestion).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: 400,
      data: { error: 'Recipe context is invalid' }
    });
  });

  it('maps a mismatched conversation to a recoverable conflict', async () => {
    mockAskCookingQuestion.mockRejectedValue(
      new SaimConversationContextError()
    );

    const result = await askSaimAction(
      createEvent({
        help_input: 'Can I swap the oil?',
        recipe: JSON.stringify(recipe),
        conversation_id: 'conv_existing',
        recipe_context_changed: 'false'
      })
    );

    expect(result).toMatchObject({
      status: 409,
      data: {
        error: 'This Saim conversation no longer matches the current recipe.'
      }
    });
  });

  it('preserves the disabled-provider response mapping', async () => {
    mockAskCookingQuestion.mockRejectedValue(new Error('OPENAI_DISABLED'));

    const result = await askSaimAction(
      createEvent({
        help_input: 'Can I swap the oil?',
        recipe: JSON.stringify(recipe),
        conversation_id: '',
        recipe_context_changed: 'false'
      })
    );

    expect(result).toMatchObject({
      status: 503,
      data: { error: 'AI service is unavailable right now' }
    });
  });
});
