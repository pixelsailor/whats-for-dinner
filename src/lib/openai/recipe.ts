import { zodTextFormat } from 'openai/helpers/zod';

import { openai } from '.';
import { RecipeSchema } from './schema';

// Causes an error when used with gpt-5-mini -- or it could be unsupported with Response API
// const temperature = 0.6;

/**
 * Requests a OpenAI create a recipe based on the provided _title_ and _description_.
 * @param title The title of the recipe being requested
 * @param desc The short description of the recipe being requested
 * @param userPreferences - Recipe requirements based on user restrictions/preferences
 * @todo DO NOT USE. Not ready for production yet. There are errors with the zod response object
 */
export async function getFullRecipe(
	title: string,
	desc: string,
	userPreferences?: string
): Promise<['detail', string | null]> {
	const systemPrompt = `
You are an expert culinary assistant. You are thoughtful about flavor profiles, ingredients and 
traditional preparation methods. Be mindful of elements that should be prepared in parallel and 
consider impact on timing. Omit unknown fields. Preserve markdown exactly as written. 
Use "\n" for new lines. Do not double-escape any special characters. ASCII only. No emojis.

Output strictly as JSON matching the schema.

## Tags Requirements:
**You MUST include at least one tag from these recognized categories:**
- **Course**: breakfast, brunch, lunch, dinner, dessert, snack, beverage
- **Cuisine**: american, italian, mexican, french, chinese, indian, japanese, thai, greek, middle eastern, mediterranean, korean, spanish  
- **Diet**: vegan, vegetarian, pescatarian, gluten-free, dairy-free, low-carb, keto, paleo, whole30
- **Cooking Method**: baking, roasting, grilling, broiling, steaming, frying, slow cooker, pressure cooker, sous vide
- **Occasion**: holiday, birthday, party, picnic, weeknight, romantic

**Additional tags encouraged:**
- Primary ingredients (e.g., "chicken", "tomato", "chocolate")
- Flavor profiles (e.g., "spicy", "sweet", "savory", "tangy") 
- Texture descriptors (e.g., "crispy", "creamy", "tender")
- Season/timing (e.g., "summer", "quick", "make-ahead")
- Any other contextually relevant descriptors

Examples of good tag combinations:
- ["dinner", "italian", "pasta", "vegetarian", "quick", "weeknight"]
- ["dessert", "american", "chocolate", "baking", "birthday", "rich"]
- ["lunch", "mediterranean", "healthy", "grilling", "summer", "fresh"]

**User Preferences**
${userPreferences || '_none_'}
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

		return ['detail', response.output_text ?? null];
	} catch (err) {
		console.error('OpenAI API error:', err);
		throw err;
	}
}
