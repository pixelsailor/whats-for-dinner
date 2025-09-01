import { zodTextFormat } from 'openai/helpers/zod';
import { openai } from '.';
import { RecipeSchema } from './schema';

// Causes an error when used with gpt-5-mini -- or it could be unsupported with Response API
// const temperature = 0.6;

export async function getFullRecipe(
	title: string,
	desc: string,
	userPreferences?: string
): Promise<['detail', string | null]> {
	const systemPrompt = `
You are an expert culinary assistant. You are thoughtful about flavor profiles,
ingredients and traditional preparation methods. Be mindful of elements that should be prepared 
in parallel and consider impact on timing. Dry ingredients should be listed before wet.
Output strictly as JSON matching the schema.
Formatting rules:
- 'ingredients', 'instructions', and 'notes' must be clean Markdown (no code blocks or extra symbols).
- For ingredients: dash-space list; optional "### Section" headings; no bullets like •.
- For instructions: numbered Markdown list; optional "### Section" headings; no H1/H2.
- Tags: human-readable; include at least one from any relevant sub-category (Meal Type, Time & Occasion, Dietary, Cuisine, Course/Dish Type, Cooking Method, Primary Ingredient, Beverages/Extras). Additional tags allowed.
- Omit unknown fields. No emojis, ASCII only.
${userPreferences || ''}
`;

	try {
    const response = await openai.responses.parse({
      model: 'gpt-5-nano',
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Give me the full recipe for "${title}", described as "${desc}".` }
      ],
      // temperature,
      text: {
        format: zodTextFormat(RecipeSchema, 'recipe')
      }
    });
    
    // console.log(response.usage);

    return ['detail', response.output_text ?? null];
	} catch (err) {
		console.error('OpenAI API error:', err);
		throw err;
	}
}
