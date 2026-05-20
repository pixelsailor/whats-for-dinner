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

import { AiSuggestionsOutputSchema, RecipeAssistanceOutputSchema } from './ai.schemas';
import {
  parseAssistanceAnswer,
  parseRecipeAddendum,
  parseRecipeDetail,
  parseRecipeRevision,
  parseStructuredOutput,
  parseSuggestionsOutput
} from './ai.model';
import { PromptContextEnum } from './ai.types';
import type {
  LegacyRecipeAddendumResponse,
  LegacyRecipeAssistanceResponse,
  LegacyRecipeDetailResponse,
  LegacyRecipeRevisionResponse,
  LegacyRecipeSuggestionsResponse
} from './ai.types';

export const OPENAI_DISABLED_ERROR = 'OPENAI_DISABLED';

let client: OpenAI | null = null;

/**
 * Returns a singleton OpenAI client for the deployment API key.
 * @throws {Error} With message {@link OPENAI_DISABLED_ERROR} when the key is unset
 */
function getOpenAI(): OpenAI {
  if (!OPENAI_API_KEY) {
    throw new Error(OPENAI_DISABLED_ERROR);
  }

  if (!client) {
    client = new OpenAI({
      apiKey: OPENAI_API_KEY
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
export async function generateRecipeSuggestions(input: string, userPreferences: string): Promise<string> {
  const instructions = `
		You are an expert meal planner. Respond with a JSON array of 4 to 10 recipe ideas based on the users's input. DO NOT include anything outside of the JSON response.
		The recipes should take into consideration the user's preferences and dietary restrictions as follows: ${preferencesClause(userPreferences)}
	`;

  try {
    const openai = getOpenAI();
    const response = await openai.responses.create({
      model: 'gpt-5-nano',
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
export async function generateRecipe(prompt: string, userPreferences?: string): Promise<string> {
  const { title, description } = JSON.parse(prompt) as { title: string; description: string };

  const instructions = `You are an expert culinary assistant. You are thoughtful about flavor profiles,
ingredients and traditional preparation methods. Consider the steps necessary during preparation
-- whether items that will be combined should be prepared/cooked separately, at the same time. Be
considerate of the total time an item may spend cooking if additional items are added that must be
cooked together. The recipes should take into consideration the user's preferences and dietary restrictions as follows: ${preferencesClause(userPreferences)}

Formatting Guidelines:
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
  const input = `Provide a complete recipe for, "${title}", as described by, "${description}"`;

  try {
    const openai = getOpenAI();
    const response = await openai.responses.create({
      model: 'gpt-5-mini',
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
      model: 'gpt-5-mini',
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

/**
 * Ask OpenAI for conversational cooking help related to an existing recipe.
 * @param question - User question
 * @param recipeJson - Serialized recipe context
 * @returns Raw structured JSON string from the provider
 */
export async function askCookingQuestion(question: string, recipeJson: string): Promise<string> {
  const recipe = parseStructuredOutput(recipeJson, RecipeSchema, 'recipe context');

  const instructions = `
You are a helpful, experienced culinary assistant helping a user working on a recipe.
When they ask a question, consider the recipe they provide and answer with helpful, conversational cooking advice.
Do not reformat or alter the recipe in any way or return code blocks or JSON in the answer field.
Keep responses concise, friendly, and informative.
`;

  const input = `
This is the recipe I'm working with:
## ${recipe.title}

**Description:** ${recipe.description ?? ''}

**Ingredients:**
${recipe.ingredients ?? ''}

**Instructions:**
${recipe.instructions ?? ''}

Now, here is my question:
${question}
`;

  const openai = getOpenAI();
  const response = await openai.responses.create({
    model: 'gpt-5-nano',
    instructions,
    input,
    text: {
      format: zodTextFormat(RecipeAssistanceOutputSchema, 'assistance')
    }
  });

  return response.output_text;
}

/**
 * Ask OpenAI to backfill missing metadata for a recipe draft.
 * @param recipe - Serialized recipe JSON
 * @param userPreferences - Optional preferences text for the model
 * @returns Raw structured JSON string from the provider
 */
export async function appendRecipeDetails(recipe: string, userPreferences?: string): Promise<string> {
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
      model: 'gpt-5-nano',
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
  const raw = await generateRecipe(JSON.stringify({ title, description: desc }), userPreferences);
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
  question: string,
  recipeJson: string
): Promise<LegacyRecipeAssistanceResponse> {
  const raw = await askCookingQuestion(question, recipeJson);
  const answer = parseAssistanceAnswer(raw);
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
