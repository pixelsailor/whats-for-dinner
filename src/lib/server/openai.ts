/**
 * OpenAI Server
 * 
 * Server-side functions for interacting with the OpenAI API.
 * 
 * @deprecated Use the functions from $lib/api/ai instead.
 * @see $lib/api/ai/ai.model.ts
 */
import type {
	FullRecipe,
	PromptContext,
	RecipeAddendum,
	RecipeAddendumResponse,
	RecipeAssistanceResponse,
	RecipeDetailResponse,
	RecipeRevisionResponse,
	RecipeSuggestionsResponse,
	RecipeSummary
} from '$lib/types';
import { PromptContextEnum } from '$lib/types';
import type { ChatCompletionMessageParam } from 'openai/resources';
import { OpenAI } from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';

const model = 'gpt-4.1-nano';

const temperature = 0.4;

export const OPENAI_DISABLED_ERROR = 'OPENAI_DISABLED';

let client: OpenAI | null = null;

/**
 * Get the OpenAI client.
 * 
 * @returns The OpenAI client.
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
 *
 * @returns Tuple where the first item is the prompt context and the second item is
 * a parsed array of `RecipeSummary` objects.
 */
export async function getRecipeSuggestions(
	input: string,
	userPreferences: string
): Promise<RecipeSuggestionsResponse> {
	const messages: ChatCompletionMessageParam[] = [
		{
			role: 'system',
			content: `You are a meal planner. Response with a JSON array of 4-8 recipe ideas based on the users's input.
			Pay attention to the user's request. Meal ideas should be assumed unless otherwise specified.
			${userPreferences}

			Each item should include:
      - title (string)
      - short_description (string)
      - estimated_time (e.g., "30 min")
      - tags (e.g., ["vegetarian", "quick"])
      
      DO NOT include anything outside of the JSON response.`
		},
		{
			role: 'user',
			content: input
		},
	];

	try {
		const openai = getOpenAI();
		// const response = await openai.responses.parse({
		// 	model,
		// 	input: messages,
		// 	text: zodResponseFormat(SummaryResponse, 'summary')
		// });
		const response = await openai.chat.completions.create({
			model,
			messages,
			temperature,
		});

		const payload = parseJsonPayload<RecipeSummary[]>(
			response.choices[0]?.message?.content,
			PromptContextEnum.SUMMARIES
		);

		return [PromptContextEnum.SUMMARIES, payload];
	} catch (error) {
		console.error('OpenAI API error:', error);
		throw error;
	}
}

/**
 * Request a complete `FullRecipe` for a suggestion the user wants to expand.
 *
 * @returns Tuple of `[PromptContextEnum.DETAIL, FullRecipe]`.
 */
export async function getFullRecipe(
	title: string,
	desc: string,
	userPreferences?: string
): Promise<RecipeDetailResponse> {
	const messages: ChatCompletionMessageParam[] = [
		{
			role: 'system',
			content: `You are an expert culinary assistant. You are thoughtful about flavor profiles,
ingredients and traditional preparation methods. Consider the steps necessary during preparation
-- whether items that will be combined should be prepared/cooked separately, at the same time. Be
considerate of the total time an item may spend cooking if additional items are added that must be
cooked together. For measured ingredients, dry ingredients should be listed before wet.
${userPreferences}
Respond ONLY with valid JSON in the following format:
      
{
  "title": "string",
  "short_description": "string (use the user's provided description)",
  "description": "string (can be a long form of the user's description with additional commentary or suggested pairings)",
  "ingredients": "markdown string (DO NOT wrap with triple backticks or code blocks)",
  "instructions": "markdown string (DO NOT wrap with triple backticks or code blocks)",
  "tags": ["string", ...],
  "yield": "e.g. 'Serves 4'",
	"prep_time": "string (can include time marinating or chilling)",
	"cook_time": "string",
  "notes": "markdown string (optional, DO NOT wrap with code blocks)"
}

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
`
		},
		{
			role: 'user',
			content: `Give me the full recipe for, "${title}", as described by, "${desc}"`
		}
	];

	try {
		const openai = getOpenAI();
		const response = await openai.chat.completions.create({
			model,
			messages,
			temperature
		});

		const payload = parseJsonPayload<FullRecipe>(
			response.choices[0]?.message?.content,
			PromptContextEnum.DETAIL
		);

		return [PromptContextEnum.DETAIL, payload];
	} catch (err) {
		console.error('OpenAI API error:', err);
		throw err;
	}
}

/**
 * Ask OpenAI to revise an existing recipe using the provided prompt.
 *
 * @returns Tuple of `[PromptContextEnum.REVISION, FullRecipe]`.
 */
export async function requestRecipeModifications(
	input: string,
	recipe: string
): Promise<RecipeRevisionResponse> {
	const messages: ChatCompletionMessageParam[] = [
		{
			role: 'system',
			content: `You are an expert culinary assistant. A user will give you a recipe and a request to modify it.
You must respond ONLY with a full updated version of the recipe in JSON format that includes:

{
  "title": "string",
  "short_description": "string",
  "description": "string",
  "ingredients": "markdown",
  "instructions": "markdown",
  "tags": ["string", ...],
  "yield": "e.g. 'Serves 4'",
  "prep_time": "string (to include time marinating or chilling)",
  "cook_time": "string",
  "notes": "markdown string (optional)"
}

Only return valid JSON — do not include any commentary, code blocks, or explanations.
If a field was not changed, preserve the original values.
Use clean, readable markdown where applicable. Do not use emojis.
Ensure the JSON is valid and parseable.
`
		},
		{
			role: 'user',
			content: `Here is the recipe:
${recipe}

Here is the user's modification request:

"${input}"
`
		}
	];
	try {
		const openai = getOpenAI();
		const response = await openai.chat.completions.create({
			model,
			messages,
			temperature: 1.0
		});

		const payload = parseJsonPayload<FullRecipe>(
			response.choices[0]?.message?.content,
			PromptContextEnum.REVISION
		);

		return [PromptContextEnum.REVISION, payload];
	} catch (err) {
		console.error('OpenAI API error:', err);
		throw err;
	}
}

/**
 * Ask OpenAI for conversational cooking help related to an existing recipe.
 *
 * @returns Tuple of `[PromptContextEnum.ASSISTANCE, string]`.
 */
export async function askCookingQuestion(
	question: string,
	recipeJson: string
): Promise<RecipeAssistanceResponse> {
	const recipe = JSON.parse(recipeJson) as FullRecipe;
	const prompt = `
You are an helpful, experienced culinary assistant helping a user working on a recipe.
When they ask a question, consider the recipe they provide and answer with helpful, conversational cooking advice.
Do not reformat or alter the recipe in any way or return code blocks or JSON.
Keep responses concise, friendly, and informative.
`;
	const input = `
This is the recipe I'm working with:
## ${recipe.title}

**Description:** ${recipe.description}

**Ingredients:**
${recipe.ingredients}

**Instructions:**
${recipe.instructions}

Now, here is my question:
${question}
`;
	const openai = getOpenAI();
	const response = await openai.chat.completions.create({
		model,
		messages: [
			{ role: 'system', content: prompt },
			{ role: 'user', content: input }
		],
		temperature
	});

	const answer = ensureContent(response.choices[0]?.message?.content, PromptContextEnum.ASSISTANCE);

	return [PromptContextEnum.ASSISTANCE, answer];
}

/**
 * Ask OpenAI to backfill missing metadata (description, tags, timing, etc.) for a recipe draft.
 *
 * @returns Tuple of `[PromptContextEnum.ADDENDUM, RecipeAddendum]`.
 */
export async function appendRecipeDetails(recipe: string): Promise<RecipeAddendumResponse> {
	const { title, time, short_description, ingredients, instructions, notes } = JSON.parse(recipe);
	const prompt = `
You are an helpful, experienced culinary assistant helping a user working on a recipe.
Given the user provided recipe details, fill in any missing fields: description, yield, time.prep, time.cook, time.total, and tags.

The response should use the following JSON format:

{
  "short_description": "string (only if missing)",
  "description": "string",
  "tags": ["string", ...],
  "yield": "e.g. 'Serves 4'",
  "prep_time": "string (to include time marinating or chilling)",
  "cook_time": "string",
}

Only return valid JSON for the missing fields — do not include any commentary, code blocks, or explanations.
If **short_description** is missing, one may be added using the recipe details as a guide.
The __description__ may be a long form of the user's **short_description** with additional commentary or suggested pairings.
Do not alter the provided recipe in any way.
`;

	const input = `
The user has provided the following recipe details:

title: ${title}
short_description: ${short_description}
time: ${time}
ingredients: ${ingredients}
instructions: ${instructions}
notes: ${notes}
`;

	const openai = getOpenAI();
	const response = await openai.chat.completions.create({
		model,
		messages: [
			{ role: 'system', content: prompt },
			{ role: 'user', content: input }
		]
	});

	const payload = parseJsonPayload<RecipeAddendum>(
		response.choices[0]?.message?.content,
		PromptContextEnum.ADDENDUM
	);

	return [PromptContextEnum.ADDENDUM, payload];
}
