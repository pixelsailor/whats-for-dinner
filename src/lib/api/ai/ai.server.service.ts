/**
 * @fileoverview Server-only OpenAI Responses API integration for recipe AI flows.
 * @module lib/api/ai/ai.server.service
 *
 * @remarks Import only from `+server.ts`, `+page.server.ts`, or other server modules.
 * Do not re-export from `index.ts` (keeps secrets and provider SDK off the client graph).
 */

import { OpenAI } from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import { OPENAI_API_KEY } from '$env/static/private';

import { RecipeSchema } from '$lib/api/recipe';
import type { PreparedImportContent } from '$lib/api/recipe-import/recipe-import.types';

import {
  AiSuggestionsOutputSchema,
  RecipeAssistanceOutputSchema
} from './ai.schemas';
import {
  parseAssistanceAnswer,
  parseRecipeAddendum,
  parseRecipeDetail,
  parseRecipeRevision,
  parseSuggestionsOutput
} from './ai.model';
import { PromptContextEnum } from './ai.types';
import type {
  AskCookingQuestionInput,
  AskCookingQuestionResult,
  LegacyRecipeAddendumResponse,
  LegacyRecipeAssistanceResponse,
  LegacyRecipeDetailResponse,
  LegacyRecipeRevisionResponse,
  LegacyRecipeSuggestionsResponse
} from './ai.types';

export const OPENAI_DISABLED_ERROR = 'OPENAI_DISABLED';
export const OPENAI_INVALID_KEY_FORMAT_ERROR = 'OPENAI_INVALID_KEY_FORMAT';

/** Raised when a supplied Conversation is not bound to the active user, recipe, and page. */
export class SaimConversationContextError extends Error {
  constructor() {
    super('SAIM_CONVERSATION_CONTEXT_MISMATCH');
    this.name = 'SaimConversationContextError';
  }
}

const formatInstructions = `Formatting Guidelines:
- Use clean, readable Markdown **within** the 'ingredients', 'instructions', and 'notes' strings.
- For ingredients:
  - Use a standard markdown list: each line begins with a dash (-), followed by a space.
  - Do NOT use bullet characters (•) or other list symbols.
  - Optional: You may use subheadings like "### For the Sauce" to divide ingredients into groups.
- For instructions:
  - Use a numbered list in Markdown format (e.g., "1. Step").
  - Optional: You may use subheadings like "### For the Sauce" to divide steps into sections.
  - Do NOT use headers like "# Instructions" — assume field labels are provided by the UI.
- For notes:
  - Use regular paragraph formatting or a markdown list.
- DO NOT wrap any markdown with triple backticks or code blocks.
- DO NOT return any extra text — respond with pure JSON only.
- DO NOT use subheadings greater than three hashes (do NOT use "#" or "##").
- If a field is unknown or not needed, omit it.
- DO NOT include any emojis or non-ASCII characters.

Keep your formatting consistent and minimal.
`;

let client: OpenAI | null = null;

/**
 * Returns a singleton OpenAI client for the deployment API key.
 * @throws {Error} With message {@link OPENAI_DISABLED_ERROR} when the key is unset
 */
function getOpenAI(): OpenAI {
  if (!OPENAI_API_KEY) {
    throw new Error(OPENAI_DISABLED_ERROR);
  }

  const normalizedApiKey = OPENAI_API_KEY.replace(
    /[\u200B-\u200D\uFEFF]/g,
    ''
  ).trim();

  if ([...normalizedApiKey].some((char) => (char.codePointAt(0) ?? -1) > 255)) {
    throw new Error(OPENAI_INVALID_KEY_FORMAT_ERROR);
  }

  if (!client) {
    client = new OpenAI({
      apiKey: normalizedApiKey
    });
  }

  return client;
}

function preferencesClause(userPreferences?: string): string {
  return userPreferences?.trim()
    ? userPreferences
    : 'No preferences or dietary restrictions provided.';
}

/**
 * Request 4–10 high-level recipe suggestions for a given prompt.
 * @param input - User prompt text
 * @param userPreferences - Serialized preferences for the model
 * @returns Raw structured JSON string from the provider
 */
export async function generateRecipeSuggestions(
  input: string,
  userPreferences: string
): Promise<string> {
  const instructions = `
		You are an expert meal planner. Respond with a JSON array of 4 to 10 recipe ideas based on the users's input. DO NOT include anything outside of the JSON response.
		The recipes should take into consideration the user's preferences and dietary restrictions as follows: ${preferencesClause(userPreferences)}
	`;

  try {
    const openai = getOpenAI();
    const response = await openai.responses.create({
      model: 'gpt-5.4-nano',
      instructions,
      input,
      text: {
        format: zodTextFormat(AiSuggestionsOutputSchema, 'suggestions')
      }
    });

    return response.output_text;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

/**
 * Request a complete recipe from a title/description prompt payload.
 * @param prompt - JSON string `{ title, description }`
 * @param userPreferences - Serialized preferences for the model
 * @returns Raw structured JSON string from the provider
 */
export async function generateRecipe(
  prompt: string,
  userPreferences?: string
): Promise<string> {
  const { title, description } = JSON.parse(prompt) as {
    title: string;
    description: string;
  };

  const instructions = `You are an expert culinary assistant. You are thoughtful about flavor profiles,
ingredients and traditional preparation methods. Consider the steps necessary during preparation
-- whether items that will be combined should be prepared/cooked separately, at the same time. Be
considerate of the total time an item may spend cooking if additional items are added that must be
cooked together. The recipes should take into consideration the user's preferences and dietary restrictions as follows: ${preferencesClause(userPreferences)}

${formatInstructions}
`;
  const input = `Provide a complete recipe for, "${title}", as described by, "${description}"`;

  try {
    const openai = getOpenAI();
    const response = await openai.responses.create({
      model: 'gpt-5.4-mini',
      instructions,
      input,
      text: {
        format: zodTextFormat(RecipeSchema, 'recipedetail')
      }
    });

    return response.output_text;
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

/**
 * Ask OpenAI to revise an existing recipe using the provided prompt.
 * @param input - Modification request from the user
 * @param recipeJson - Serialized recipe to revise
 * @param userPreferences - Optional preferences text for the model
 * @returns Raw structured JSON string from the provider
 * @deprecated Use {@link askCookingQuestion} instead.
 */
export async function requestRecipeModifications(
  input: string,
  recipeJson: string,
  userPreferences?: string
): Promise<string> {
  const instructions = `You are an expert culinary assistant. A user will give you a recipe and a request to modify it.
You must respond ONLY with a full updated version of the recipe in JSON format.

Only return valid JSON — do not include any commentary, code blocks, or explanations.
If a field was not changed, preserve the original values.
Use clean, readable markdown where applicable. Do not use emojis.
The recipes should take into consideration the user's preferences and dietary restrictions as follows: ${preferencesClause(userPreferences)}
`;

  const userInput = `Here is the recipe:
${recipeJson}

Here is the user's modification request:

"${input}"
`;

  try {
    const openai = getOpenAI();
    const response = await openai.responses.create({
      model: 'gpt-5.4-nano',
      instructions,
      input: userInput,
      text: {
        format: zodTextFormat(RecipeSchema, 'revision')
      }
    });

    return response.output_text;
  } catch (err) {
    console.error('OpenAI API error:', err);
    throw err;
  }
}

const SAIM_CONVERSATION_PURPOSE = 'saim_recipe_assistance';

/**
 * Serializes only the culinary recipe fields needed by Saim.
 * @param input - Validated recipe and page context
 * @param updated - Whether this replaces an earlier recipe snapshot
 * @returns Developer message for the OpenAI Conversation
 */
function createSaimRecipeContextMessage(
  input: AskCookingQuestionInput,
  updated: boolean
): string {
  const recipe = RecipeSchema.parse(input.context.recipe);
  const contextLabel = updated
    ? 'The recipe on the current page has been updated. Use this latest snapshot from now on.'
    : 'Use this recipe as the context for this conversation.';

  return `${contextLabel}
Page: ${input.context.pathname}

Recipe JSON:
\`\`\`json
${JSON.stringify(recipe)}
\`\`\``;
}

/**
 * Returns metadata that binds a provider Conversation to one Saim page session.
 * @param input - Validated recipe, page, and user context
 * @returns OpenAI-compatible string metadata
 */
function createSaimConversationMetadata(
  input: AskCookingQuestionInput
): Record<string, string> {
  return {
    purpose: SAIM_CONVERSATION_PURPOSE,
    user_id: input.context.userId,
    recipe_id: input.context.recipe.id,
    page_path: input.context.pathname
  };
}

/**
 * Verifies that an existing Conversation belongs to the active Saim context.
 * @param metadata - Provider metadata from the retrieved Conversation
 * @param input - Active recipe, page, and user context
 * @throws {SaimConversationContextError} When any binding does not match
 */
function assertSaimConversationMetadata(
  metadata: unknown,
  input: AskCookingQuestionInput
): void {
  const expected = createSaimConversationMetadata(input);

  if (
    typeof metadata !== 'object' ||
    metadata === null ||
    Object.entries(expected).some(
      ([key, value]) => (metadata as Record<string, unknown>)[key] !== value
    )
  ) {
    throw new SaimConversationContextError();
  }
}

/**
 * Ask OpenAI for stateful cooking help related to the recipe on the active page.
 * @param input - Question and the user/recipe/page context for a new or existing Conversation
 * @returns Structured provider output and the bound Conversation id
 * @throws {SaimConversationContextError} When a supplied Conversation has different metadata
 */
export async function askCookingQuestion(
  input: AskCookingQuestionInput
): Promise<AskCookingQuestionResult> {
  const instructions = `
You are a helpful, experienced culinary assistant.
Keep responses concise, friendly, and informative.
Only alter the recipe if asked to do so. If unsure, respond with the answer then offer to update the recipe if needed.
Do NOT change the recipe format or structure unless asked to do so.
`;

  const openai = getOpenAI();
  let conversationId = input.conversationId;

  if (conversationId) {
    const conversation = await openai.conversations.retrieve(conversationId);
    assertSaimConversationMetadata(conversation.metadata, input);
  } else {
    const conversation = await openai.conversations.create({
      metadata: createSaimConversationMetadata(input),
      items: [
        {
          type: 'message',
          role: 'developer',
          content: createSaimRecipeContextMessage(input, false)
        }
      ]
    });
    conversationId = conversation.id;
  }

  const responseInput = input.recipeContextChanged
    ? [
        {
          type: 'message' as const,
          role: 'developer' as const,
          content: createSaimRecipeContextMessage(input, true)
        },
        {
          type: 'message' as const,
          role: 'user' as const,
          content: input.question
        }
      ]
    : input.question;

  const response = await openai.responses.create({
    model: 'gpt-5.4-mini',
    instructions,
    conversation: conversationId,
    input: responseInput,
    text: {
      format: zodTextFormat(RecipeAssistanceOutputSchema, 'assistance')
    }
  });

  return {
    outputText: response.output_text,
    conversationId
  };
}

/**
 * Ask OpenAI to backfill missing metadata for a recipe draft.
 * @param recipe - Serialized recipe JSON
 * @param userPreferences - Optional preferences text for the model
 * @returns Raw structured JSON string from the provider
 */
export async function appendRecipeDetails(
  recipe: string,
  userPreferences?: string
): Promise<string> {
  const {
    title,
    short_description,
    description,
    yield: recipeYield,
    prep_time,
    cook_time,
    ingredients,
    instructions: recipeInstructions,
    notes,
    tags
  } = JSON.parse(recipe) as Record<string, unknown>;

  const systemInstructions = `You are an experienced culinary assistant helping a user working on a recipe.
They have provided the following recipe but some of the fields are missing. Using the provided recipe as a guide, fill in any missing fields using your best estimation.

DO NOT alter the recipe.
DO NOT include any commentary, code blocks, or explanations.
DO NOT return any extra text — respond with pure JSON only.
DO NOT include any emojis or non-ASCII characters.
YOU MAY add additional tags to the recipe if you think they are appropriate.
The recipes should take into consideration the user's preferences and dietary restrictions as follows: ${preferencesClause(userPreferences)}
`;

  const input = `The user has provided the following recipe details:

title: ${title}
short_description: ${short_description}
description: ${description}
yield: ${recipeYield}
prep_time: ${prep_time}
cook_time: ${cook_time}
tags: ${tags}
ingredients: ${ingredients}
instructions: ${recipeInstructions}
notes: ${notes}
`;

  try {
    const openai = getOpenAI();
    const response = await openai.responses.create({
      model: 'gpt-5.4-nano',
      instructions: systemInstructions,
      input,
      text: {
        format: zodTextFormat(RecipeSchema, 'recipedetail')
      }
    });

    return response.output_text;
  } catch (err) {
    console.error('OpenAI API error:', err);
    throw err;
  }
}

/**
 * Parses a recipe from prepared page content (ADR-017). Caller must fetch and prepare first.
 * @param prepared - Server-prepared JSON-LD and/or sanitized HTML body from the page
 * @param url - Optional canonical source URL for attribution
 * @returns Raw structured JSON string from the provider
 */
export async function parseRecipeFromPageContent(
  prepared: PreparedImportContent,
  url?: string
): Promise<string> {
  const instructions = `You are a recipe extraction assistant, not a recipe author.

Your job is to parse the recipe from the PROVIDED PAGE CONTENT below into the required JSON shape.
PROVIDED PAGE CONTENT may take different forms, including:
- Plain text
- Markdown
- HTML
- A combination of the above

Source priority within the provided content:
1. PRIMARY SOURCE block (JSON-LD Recipe data) when present.
2. SUPPLEMENTAL BODY (sanitized HTML) for any fields missing from the primary block.

Extraction rules:
- title, ingredients, and instructions must come only from the provided content blocks, not from the URL path or your memory of a dish with a similar name.
- Preserve ingredient quantities, units, and order; light normalization only (e.g. trim whitespace, unify list markers to markdown "- "). You may group ingredients into subheadings if prudent.
- Preserve step order and wording; you may renumber for markdown "1. 2. 3." but do not merge, split, or rewrite steps unless the source is clearly one combined step.
- Ambigious or vague instructions may be clarified or expanded upon provided the original source is preserved.
- description and short_description: use only text present in the provided content.
- yield, prep_time, cook_time: copy from the provided content when present; do not guess typical values for the dish.
- Prep and cook times should be converted to minutes. Do not include hyphens, dashes, or other separators. Ranges should be an array of two numbers.
- notes may be taken from anywhere in the provided content, including narrative, comments, and notes. You may also add your own notes to the recipe if warranted.
- tags: infer only from explicit labels in the provided content; do not tag from guesswork.
- remove first-person narrative and pronouns from the provided content -- reword as necessary to make the recipe more objective.
- Ignore ads, comments, related recipes, navigation, and author bios if they appear in supplemental body HTML.

${formatInstructions}
`;

  const input = `Source URL: ${url}

--- PRIMARY SOURCE (JSON-LD Recipe; prefer this) ---
${prepared.primaryBlock || '(none)'}

--- SUPPLEMENTAL BODY (sanitized HTML) ---
${prepared.sanitizedBodyContent || '(none)'}
--- END PAGE CONTENT ---`;

  try {
    const openai = getOpenAI();
    const response = await openai.responses.create({
      model: 'gpt-5.4-mini',
      instructions,
      input,
      text: {
        format: zodTextFormat(RecipeSchema, 'import')
      }
    });

    return response.output_text;
  } catch (err) {
    console.error('OpenAI API error:', err);
    throw err;
  }
}

/**
 * Parses a recipe from provided text content.
 * @param text - Provided text content
 * @returns Raw structured JSON string from the provider
 */
export async function parseRecipeFromText(text: string): Promise<string> {
  const instructions = `You are a recipe extraction assistant, not a recipe author.

Your job is to parse the recipe from the PROVIDED TEXT CONTENT below into the required JSON shape.
PROVIDED TEXT CONTENT may take different forms, including:
- Plain text
- Markdown
- HTML
- A combination of the above

Extraction rules:
- title, ingredients, and instructions must come only from the provided content blocks, not from the URL path or your memory of a dish with a similar name.
- Preserve ingredient quantities, units, and order; light normalization only (e.g. trim whitespace, unify list markers to markdown "- "). You may group ingredients into subheadings if prudent.
- Preserve step order and wording; you may renumber for markdown "1. 2. 3." but do not merge, split, or rewrite steps unless the source is clearly one combined step.
- Ambigious or vague instructions may be clarified or expanded upon provided the original source is preserved.
- description and short_description: use only text present in the provided content.
- yield, prep_time, cook_time: copy from the provided content when present; do not guess typical values for the dish.
- Prep and cook times should be converted to minutes. Do not include hyphens, dashes, or other separators. Ranges should be an array of two numbers.
- notes may be taken from anywhere in the provided content, including narrative, comments, and notes. You may also add your own notes to the recipe if warranted.
- tags: infer only from explicit labels in the provided content; do not tag from guesswork.
- remove first-person narrative and pronouns from the provided content -- reword as necessary to make the recipe more objective.
- Ignore ads, comments, related recipes, navigation, and author bios if they appear in supplemental body HTML.

${formatInstructions}
`;

  const input = `Provided Text Content: ${text}

--- PROVIDED TEXT CONTENT ---
${text || '(none)'}
--- END TEXT CONTENT ---`;

  try {
    const openai = getOpenAI();
    const response = await openai.responses.create({
      model: 'gpt-5.4-mini',
      instructions,
      input,
      text: {
        format: zodTextFormat(RecipeSchema, 'import')
      }
    });

    return response.output_text;
  } catch (err) {
    console.error('OpenAI API error:', err);
    throw err;
  }
}

// --- Legacy tuple responses for `/api/recipes` and form actions ---

/**
 * Legacy `/api/recipes` summaries action; prefer {@link generateRecipeSuggestions} in new routes.
 */
export async function getRecipeSuggestions(
  input: string,
  userPreferences: string
): Promise<LegacyRecipeSuggestionsResponse> {
  const raw = await generateRecipeSuggestions(input, userPreferences);
  const { suggestions } = parseSuggestionsOutput(raw);
  return [PromptContextEnum.SUMMARIES, suggestions];
}

/**
 * Legacy `/api/recipes` detail action; prefer {@link generateRecipe} in new routes.
 */
export async function getFullRecipe(
  title: string,
  desc: string,
  userPreferences?: string
): Promise<LegacyRecipeDetailResponse> {
  const raw = await generateRecipe(
    JSON.stringify({ title, description: desc }),
    userPreferences
  );
  const recipe = parseRecipeDetail(raw);
  return [PromptContextEnum.DETAIL, recipe];
}

/**
 * Form action and `/api/recipes` revision handler.
 */
export async function requestRecipeModificationsWithContext(
  input: string,
  recipe: string,
  userPreferences?: string
): Promise<LegacyRecipeRevisionResponse> {
  const raw = await requestRecipeModifications(input, recipe, userPreferences);
  const recipePayload = parseRecipeRevision(raw);
  return [PromptContextEnum.REVISION, recipePayload];
}

/**
 * Form action and `/api/recipes` assistance handler.
 */
export async function askCookingQuestionWithContext(
  input: AskCookingQuestionInput
): Promise<LegacyRecipeAssistanceResponse> {
  const result = await askCookingQuestion(input);
  const answer = parseAssistanceAnswer(result.outputText);
  return [PromptContextEnum.ASSISTANCE, answer];
}

/**
 * Legacy `/api/recipes` addendum action.
 */
export async function appendRecipeDetailsWithContext(
  recipe: string,
  userPreferences?: string
): Promise<LegacyRecipeAddendumResponse> {
  const raw = await appendRecipeDetails(recipe, userPreferences);
  const addendum = parseRecipeAddendum(raw);
  return [PromptContextEnum.ADDENDUM, addendum];
}
