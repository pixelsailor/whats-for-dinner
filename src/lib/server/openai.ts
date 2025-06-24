import { VITE_OPENAI_API_KEY } from '$env/static/private';
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
			model: 'gpt-4o',
			messages,
			temperature: 0.7
		});

		return response.choices[0].message.content || 'No response received.';
	} catch (error) {
		console.error('OpenAI API error:', error);
		throw error;
	}
}
