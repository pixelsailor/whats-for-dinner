import { VITE_OPENAI_API_KEY } from '$env/static/private';
import type { FullRecipe, PromptContext } from '$lib/types';
import { OpenAI } from 'openai/client.js';
import type { ChatCompletionMessageParam } from 'openai/resources';

const openai = new OpenAI({
	apiKey: VITE_OPENAI_API_KEY
});

const model = 'gpt-4.1-nano';

export async function getRecipeSuggestions(input: string): Promise<[PromptContext, string|null]> {
	const messages: ChatCompletionMessageParam[] = [
		{
			role: 'system',
			content: `You are a meal planner. Response with a JSON array of 4-8 meal ideas based on the users's input. Each item should include:
      - title (string)
      - short_description (string)
      - estimated_time (e.g., "30 min")
      - tags (e.g., ["vegetarian", "quick"])
      
      DO NOT include anything outside of the JSON response.`
		},
		{
			role: 'user',
			content: input
		}
	];

	try {
		const response = await openai.chat.completions.create({
			model,
			messages,
			temperature: 0.7
		});

		return ['summaries', response.choices[0].message.content || null];
	} catch (error) {
		console.error('OpenAI API error:', error);
		throw error;
	}
}

export async function getFullRecipe(title: string, desc: string): Promise<['detail', string|null]> {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `You are an expert culinary assistant.
Respond ONLY with valid JSON in the following format:
      
{
  "title": "string",
  "description": "string",
  "ingredients": "markdown string (DO NOT wrap with triple backticks or code blocks)",
  "instructions": "markdown string (DO NOT wrap with triple backticks or code blocks)",
  "tags": ["string", ...],
  "yield": "e.g. 'Serves 4'",
  "time": {
      "prep": "string (can include time marinating or chilling)",
      "cook": "string",
      "total": "string"
  },
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
- If a field is unknown or not needed, omit it.
- DO NOT include any emojis or non-ASCII characters.

Keep your formatting consistent and minimal.
`
    },
    {
      role: 'user',
      content: `Give me the full recipe for, "${title}", in accordance with its description, "${desc}"`
    }
  ];

  try {
    const response = await openai.chat.completions.create({
      model,
      messages
    });
  
    return ['detail', response.choices[0].message.content ?? null];
  }
  catch (err) {
    console.error('OpenAI API error:', err);
    throw err;
  }
}

export async function requestRecipeModifications(input: string, recipe: string): Promise<[PromptContext, string|null]> {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `You are an expert culinary assistant. A user will give you a recipe and a request to modify it.
You must respond ONLY with a full updated version of the recipe in JSON format that includes:

{
  "title": "string",
  "description": "string",
  "ingredients": "markdown",
  "instructions": "markdown",
  "tags": ["string", ...],
  "yield": "e.g. 'Serves 4'",
  "time": {
      "prep": "string (to include time marinating or chilling)",
      "cook": "string",
      "total": "string"
  },
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
  ]
  try {
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.7
    });

    return ['revision', response.choices[0].message.content ?? null];
  } catch (err) {
    console.error('OpenAI API error:', err);
    throw err;
  }
}

export async function askCookingQuestion(question: string, recipeJson: string): Promise<[PromptContext, string|null]> {
  const recipe = JSON.parse(recipeJson) as FullRecipe;
  const prompt = `
You are an helpful, experienced culinary assistant helping a user working on a recipe.
When they ask a question, consider the recipe they provide and answer with helpful, conversational cooking advice.
Do not reformat or alter the recipe in any way or return code blocks or JSON.
Keep responses concise, friendly, and informative.
`
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
`
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: input }
    ],
    temperature: 0.7
  });

  return ['assistance', response.choices[0].message.content ?? null];
}
