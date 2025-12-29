/**
 * AI Model
 * 
 * Legacy model for the AI using OpenAI's Chat Completion API. This is a work in progress. Continue
 * to use the deprecated function from $lib/openai until this is complete.
 * 
 * @todo Replace with new Open AI Response API.
 * @todo Use structured JSON responses with zod schemas.
 * @todo Refactor responses without context tuples.
 */
// import type { ChatCompletionMessageParam } from 'openai/resources';
import { OpenAI } from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';

import { VITE_OPENAI_API_KEY } from '$env/static/private';

import {
	type PromptContext,
	type RecipeAddendum,
	type RecipeAddendumResponse,
	type RecipeAssistanceResponse,
	type RecipeDetailResponse,
	RecipeDetailResponseSchema,
	type RecipeRevisionResponse,
	type RecipeSuggestionsResponse,
	RecipeSuggestionsResponseSchema,
} from '$lib/api/ai';
import { PromptContextEnum } from '$lib/types';
import { type Recipe, RecipeSchema, type RecipeSummary, RecipeSummarySchema } from '$lib/api/recipe';

export const OPENAI_DISABLED_ERROR = 'OPENAI_DISABLED';

let client: OpenAI | null = null;

/**
 * Get the OpenAI client.
 * 
 * @returns The OpenAI client.
 */
function getOpenAI(): OpenAI {
	if (!VITE_OPENAI_API_KEY) {
		throw new Error(OPENAI_DISABLED_ERROR);
	}

	if (!client) {
		client = new OpenAI({
			apiKey: VITE_OPENAI_API_KEY
		});
	}

	return client;
}

type ChatContent = string | null | undefined;

function ensureContent(raw: ChatContent, context: PromptContext): string {
	if (!raw || !raw.trim()) {
		throw new Error(`OpenAI returned an empty response for "${context}".`);
	}

	return raw;
}

function parseJsonPayload<TPayload>(raw: ChatContent, context: PromptContext): TPayload {
	const content = ensureContent(raw, context);

	try {
		return JSON.parse(content) as TPayload;
	} catch (error) {
		console.error(`Failed to parse OpenAI JSON for "${context}".`, { content, error });
		throw new Error(`Failed to parse OpenAI JSON for "${context}".`);
	}
}

/**
 * Request 4-8 high-level recipe suggestions for a given prompt.
 */
export async function generateRecipeSuggestions(
	input: string,
	userPreferences: string
): Promise<string | Error> {
	const instructions = `
		You are a meal planner. Response with a JSON array of 4-8 recipe ideas based on the users's input. DO NOT include anything outside of the JSON response.
		The recipes should take into consideration the user's preferences and dietary restrictions as follows: ${userPreferences}
	`;

	try {
		const openai = getOpenAI();
		const response = await openai.responses.create({
			model: 'gpt-5-nano',
			instructions,
			input,
			text: {
				format: zodTextFormat(RecipeSuggestionsResponseSchema, 'suggestions')
			}
		});

		// return JSON.parse(response.output_text) as RecipeSuggestionsResponse;
		return response.output_text;
		// const payload = response.output_text;
		// return [PromptContextEnum.SUMMARIES, payload];
	} catch (error) {
		console.error('OpenAI API error:', error);
		throw error;
	}
}

/**
 * Request a complete `Recipe` based on the provided title and description.
 */
export async function generateRecipe(
	prompt: string,
	userPreferences?: string
): Promise<string | Error> {
	const { title, description } = JSON.parse(prompt) as { title: string, description: string };

	const instructions = `You are an expert culinary assistant. You are thoughtful about flavor profiles,
ingredients and traditional preparation methods. Consider the steps necessary during preparation
-- whether items that will be combined should be prepared/cooked separately, at the same time. Be
considerate of the total time an item may spend cooking if additional items are added that must be
cooked together. The recipes should take into consideration the user's preferences and dietary restrictions as follows: ${userPreferences}

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

		// return JSON.parse(response.output_text) as RecipeSuggestionsResponse;
		return response.output_text;
		// const payload = response.output_text;
		// return [PromptContextEnum.SUMMARIES, payload];
	} catch (error) {
		console.error('OpenAI API error:', error);
		throw error;
	}
}

// /**
//  * Ask OpenAI to revise an existing recipe using the provided prompt.
//  *
//  * @returns Tuple of `[PromptContextEnum.REVISION, Recipe]`.
//  */
// export async function requestRecipeModifications(
// 	input: string,
// 	recipe: string
// ): Promise<RecipeRevisionResponse> {
// 	const messages: ChatCompletionMessageParam[] = [
// 		{
// 			role: 'system',
// 			content: `You are an expert culinary assistant. A user will give you a recipe and a request to modify it.
// You must respond ONLY with a full updated version of the recipe in JSON format that includes:

// {
//   "title": "string",
//   "short_description": "string",
//   "description": "string",
//   "ingredients": "markdown",
//   "instructions": "markdown",
//   "tags": ["string", ...],
//   "yield": "e.g. 'Serves 4'",
// 	"prep_time": "string (to include time marinating or chilling)",
// 	"cook_time": "string",
//   "notes": "markdown string (optional)"
// }

// Only return valid JSON — do not include any commentary, code blocks, or explanations.
// If a field was not changed, preserve the original values.
// Use clean, readable markdown where applicable. Do not use emojis.
// Ensure the JSON is valid and parseable.
// `
// 		},
// 		{
// 			role: 'user',
// 			content: `Here is the recipe:
// ${recipe}

// Here is the user's modification request:

// "${input}"
// `
// 		}
// 	];
// 	try {
// 		const openai = getOpenAI();
// 		const response = await openai.chat.completions.create({
// 			model,
// 			messages,
// 			temperature: 1.0
// 		});

// 		const payload = parseJsonPayload<Recipe>(
// 			response.choices[0]?.message?.content,
// 			PromptContextEnum.REVISION
// 		);

// 		return [PromptContextEnum.REVISION, payload];
// 	} catch (err) {
// 		console.error('OpenAI API error:', err);
// 		throw err;
// 	}
// }

// /**
//  * Ask OpenAI for conversational cooking help related to an existing recipe.
//  *
//  * @returns Tuple of `[PromptContextEnum.ASSISTANCE, string]`.
//  */
// export async function askCookingQuestion(
// 	question: string,
// 	recipeJson: string
// ): Promise<RecipeAssistanceResponse> {
// 	const recipe = JSON.parse(recipeJson) as Recipe;
// 	const prompt = `
// You are an helpful, experienced culinary assistant helping a user working on a recipe.
// When they ask a question, consider the recipe they provide and answer with helpful, conversational cooking advice.
// Do not reformat or alter the recipe in any way or return code blocks or JSON.
// Keep responses concise, friendly, and informative.
// `;
// 	const input = `
// This is the recipe I'm working with:
// ## ${recipe.title}

// **Description:** ${recipe.description}

// **Ingredients:**
// ${recipe.ingredients}

// **Instructions:**
// ${recipe.instructions}

// Now, here is my question:
// ${question}
// `;
// 	const openai = getOpenAI();
// 	const response = await openai.chat.completions.create({
// 		model,
// 		messages: [
// 			{ role: 'system', content: prompt },
// 			{ role: 'user', content: input }
// 		],
// 		temperature
// 	});

// 	const answer = ensureContent(response.choices[0]?.message?.content, PromptContextEnum.ASSISTANCE);

// 	return [PromptContextEnum.ASSISTANCE, answer];
// }

// /**
//  * Ask OpenAI to backfill missing metadata (description, tags, timing, etc.) for a recipe draft.
//  *
//  * @returns Tuple of `[PromptContextEnum.ADDENDUM, RecipeAddendum]`.
//  */
// export async function appendRecipeDetails(recipe: string): Promise<RecipeAddendumResponse> {
// 	const { title, short_description, ingredients, instructions, notes } = JSON.parse(recipe);
// 	const prompt = `
// You are a helpful, experienced culinary assistant helping a user working on a recipe.
// Given the user provided recipe details, fill in any missing fields: description, yield, time.prep, time.cook, time.total, and tags.

// The response should use the following JSON format:

// {
//   "short_description": "string (only if missing)",
//   "description": "string",
//   "tags": ["string", ...],
//   "yield": "e.g. 'Serves 4'",
// 	"prep_time": "string (to include time marinating or chilling)",
// 	"cook_time": "string",
// }

// Only return valid JSON for the missing fields — do not include any commentary, code blocks, or explanations.
// If **short_description** is missing, one may be added using the recipe details as a guide.
// The __description__ may be a long form of the user's **short_description** with additional commentary or suggested pairings.
// Do not alter the provided recipe in any way.
// `;

// 	const input = `
// The user has provided the following recipe details:

// title: ${title}
// short_description: ${short_description}
// ingredients: ${ingredients}
// instructions: ${instructions}
// notes: ${notes}
// `;

// 	const openai = getOpenAI();
// 	const response = await openai.chat.completions.create({
// 		model,
// 		messages: [
// 			{ role: 'system', content: prompt },
// 			{ role: 'user', content: input }
// 		]
// 	});

// 	const payload = parseJsonPayload<RecipeAddendum>(
// 		response.choices[0]?.message?.content,
// 		PromptContextEnum.ADDENDUM
// 	);

// 	return [PromptContextEnum.ADDENDUM, payload];
// }
