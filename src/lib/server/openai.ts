import { VITE_OPENAI_API_KEY } from '$env/static/private';
import type { FullRecipe } from '$lib/types';
import { OpenAI } from 'openai/client.js';
import type { ChatCompletionMessageParam } from 'openai/resources';

const openai = new OpenAI({
	apiKey: VITE_OPENAI_API_KEY
});

const model = 'gpt-4.1-nano';

export async function getRecipeSuggestions(input: string): Promise<string|undefined> {
	const messages: ChatCompletionMessageParam[] = [
		{
			role: 'system',
			content: `You are a meal planner. Response with a JSON array of 5-10 meal ideas based on the users's input. Each item should include:
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

		return response.choices[0].message.content || undefined;
	} catch (error) {
		console.error('OpenAI API error:', error);
		throw error;
	}
}

export async function getFullRecipe(title: string): Promise<string|undefined> {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `You are an expert culinary assistant.
Respond ONLY with valid JSON in the following format:
      
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
  
Do not return anything except valid JSON.
If a field is unknown or not needed, omit it.
Use clean, readable markdown where applicable. Do not use emojis.
`
    },
    {
      role: 'user',
      content: `Give me the full recipe for, "${title}"`
    }
  ];

  try {
    const response = await openai.chat.completions.create({
      model,
      messages
    });
  
    return response.choices[0].message.content ?? undefined;
  }
  catch (err) {
    console.error('OpenAI API error:', err);
    throw err;
  }
}

export async function requestRecipeModifications(input: string, recipe: string): Promise<['recipe', string]> {
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

    return ['recipe', response.choices[0].message.content ?? `I wasn't able to complete that request.`];
  } catch (err) {
    console.error('OpenAI API error:', err);
    throw err;
  }
}

export async function askCookingQuestion(question: string, recipeJson: string): Promise<['conversation', string]> {
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

  return ['conversation', response.choices[0].message.content ?? `Sorry, I can't answer that right now.`];
}
