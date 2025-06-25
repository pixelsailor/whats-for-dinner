import { VITE_OPENAI_API_KEY } from '$env/static/private';
import type { FullRecipe } from '$lib/types';
import { OpenAI } from 'openai/client.js';
import type { ChatCompletionMessageParam } from 'openai/resources';

const openai = new OpenAI({
	apiKey: VITE_OPENAI_API_KEY
});

export async function getRecipeSuggestions(input: string) {
	const messages: ChatCompletionMessageParam[] = [
		{
			role: 'system',
			content: `You are a meal planner. Response with a JSON array of 3-5 meal ideas based on the users's input. Each item should include:
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
			model: 'gpt-4.1-mini',
			messages,
			temperature: 0.7
		});

		return response.choices[0].message.content || 'No response received.';
	} catch (error) {
		console.error('OpenAI API error:', error);
		throw error;
	}
}

export async function getFullRecipe(title: string): Promise<FullRecipe> {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: `You are a helpful meal assistant. Respond ONLY with valid JSON following this format:
      
      {
        "title": "string",
        "description": "string",
        "ingredients": ["string", ...],
        "instructions": ["string", ...],
        "estimated_time": "string",
        "tags": ["string", ...]
      }`
    },
    {
      role: 'user',
      content: `Give me the full recipe for, "${title}"`
    }
  ];

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages
    });
  
    // return response.choices[0].message.content || 'No response received.';
    return JSON.parse(response.choices[0].message.content ?? '{}.');
  }
  catch (err) {
    console.error('OpenAI API error:', err);
    throw err;
  }
}