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
  AskSaimActionResultSchema,
  AskSaimFormSchema,
  SaimConversationContextSchema
} from '$lib/api/ai/ai.schemas';
import {
  OPENAI_DISABLED_ERROR,
  SaimConversationContextError,
  askCookingQuestion
} from '$lib/api/ai/ai.server.service';
import { SavedRecipeSchema } from '$lib/api/recipe';

/**
 * Handles the `asksaim` form action: answers a cooking question in recipe context.
 * @param event - SvelteKit request event with form body and locals
 * @returns Success payload with markdown answer, or `fail()` outcome
 */
export async function askSaimAction({
  request,
  locals,
  url
}: Pick<RequestEvent, 'request' | 'locals' | 'url'>) {
  const { session, permissions } = locals;

  if (!session) {
    return fail(401, { error: 'Authentication required' });
  }

  const aiAllowed = Boolean(permissions?.ai_assistance);

  if (!aiAllowed) {
    return fail(403, { error: 'AI access denied' });
  }

  const formData = await request.formData();
  const rawConversationId = formData.get('conversation_id');
  const parsedForm = AskSaimFormSchema.safeParse({
    conversationId:
      typeof rawConversationId === 'string' && rawConversationId.length > 0
        ? rawConversationId
        : undefined,
    question: formData.get('help_input'),
    recipe: formData.get('recipe'),
    recipeContextChanged: formData.get('recipe_context_changed') === 'true'
  });

  if (!parsedForm.success) {
    return fail(400, { error: 'Invalid cooking-assistance request' });
  }

  const question = sanitizePromptInput(parsedForm.data.question);
  if (!question) {
    return fail(400, { error: 'A question is required' });
  }

  let recipeJson: unknown;
  try {
    recipeJson = JSON.parse(parsedForm.data.recipe);
  } catch {
    return fail(400, { error: 'Recipe context is invalid' });
  }

  const parsedRecipe = SavedRecipeSchema.safeParse(recipeJson);
  if (!parsedRecipe.success) {
    return fail(400, { error: 'Recipe context is invalid' });
  }

  const parsedContext = SaimConversationContextSchema.safeParse({
    pathname: url.pathname,
    recipe: parsedRecipe.data,
    userId: session.user.id
  });
  if (!parsedContext.success) {
    return fail(400, { error: 'Recipe page context is invalid' });
  }

  try {
    const result = await askCookingQuestion({
      question,
      context: parsedContext.data,
      conversationId: parsedForm.data.conversationId,
      recipeContextChanged: parsedForm.data.recipeContextChanged
    });
    const answer = parseAssistanceAnswer(result.outputText);

    return AskSaimActionResultSchema.parse({
      answer,
      conversationId: result.conversationId
    });
  } catch (err) {
    if (err instanceof AiParseError) {
      return fail(502, { error: err.message });
    }

    if (err instanceof SaimConversationContextError) {
      return fail(409, {
        error: 'This Saim conversation no longer matches the current recipe.'
      });
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
