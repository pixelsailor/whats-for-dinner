/**
 * @fileoverview Shared form-action handler for Saim cooking assistance on recipe routes.
 * @module lib/api/ai/asksaim.action
 */

import { type RequestEvent, fail } from '@sveltejs/kit';

import {
  AiParseError,
  parseAssistanceAnswer,
  sanitizePromptInput
} from '$lib/api/ai/ai.model';
import {
  OPENAI_DISABLED_ERROR,
  askCookingQuestion
} from '$lib/api/ai/ai.server.service';

/**
 * Handles the `asksaim` form action: answers a cooking question in recipe context.
 * @param event - SvelteKit request event with form body and locals
 * @returns Success payload with markdown answer, or `fail()` outcome
 */
export async function askSaimAction({
  request,
  locals
}: Pick<RequestEvent, 'request' | 'locals'>) {
  const { session, permissions } = locals;

  if (!session) {
    return fail(401, { error: 'Authentication required' });
  }

  const aiAllowed = Boolean(permissions?.ai_assistance);

  if (!aiAllowed) {
    return fail(403, { error: 'AI access denied' });
  }

  const formData = await request.formData();
  const question = sanitizePromptInput(
    (formData.get('help_input') as string) ?? ''
  );
  const recipe = (formData.get('recipe') as string) ?? '';

  if (!question) {
    return fail(400, { error: 'A question is required' });
  }

  if (!recipe) {
    return fail(400, { error: 'Recipe context is required' });
  }

  try {
    const raw = await askCookingQuestion(question, recipe);
    const answer = parseAssistanceAnswer(raw);

    return { answer };
  } catch (err) {
    if (err instanceof AiParseError) {
      return fail(502, { error: err.message });
    }

    if (err instanceof Error && err.message === OPENAI_DISABLED_ERROR) {
      return fail(503, { error: 'AI service is unavailable right now' });
    }

    console.error('asksaim action failed', err);

    return fail(500, {
      error: 'Unable to get a response. Please try again.'
    });
  }
}
