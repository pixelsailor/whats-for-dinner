import { z } from 'zod';

const CATEGORY_TAGS = {
	course: ['breakfast', 'brunch', 'lunch', 'dinner', 'dessert', 'snack', 'beverage'],
	cuisine: [
		'american',
		'brazillian',
		'italian',
		'mexican',
		'french',
		'chinese',
		'indian',
		'japanese',
		'thai',
		'greek',
		'middle eastern',
		'mediterranean',
		'korean',
		'spanish',
		'portuguese',
		'turkish',
		'indonesian',
		'polish',
		'peruvian',
		'serbian',
		'croatian',
		'colombian',
		'vietnamese',
		'hungarian',
		'german',
		'argentinian',
		'lebanese',
		'russian',
		'polynesian',
		'moroccan',
		'scandanavian',
		'african',
		'south american',
		'north american',
		'eastern european',
		'south asian'
	],
	diet: [
		'vegan',
		'vegetarian',
		'pescatarian',
		'gluten-free',
		'dairy-free',
		'low-carb',
		'keto',
		'paleo',
		'whole30',
		'diabetic-friendly',
		'low-fat'
	],
	cookingmethod: [
		'baking',
		'roasting',
		'grilling',
		'broiling',
		'steaming',
		'frying',
		'slow cooker',
		'pressure cooker',
		'sous vide',
		'air fryer'
	],
	occasion: ['holiday', 'birthday', 'party', 'picnic', 'weeknight', 'romantic']
};

// Create a case-insensitive lookup map
const ALL_TAGS = Object.values(CATEGORY_TAGS).flat();
const TAG_LOOKUP = new Map(ALL_TAGS.map((tag) => [tag.toLowerCase(), tag]));

export const RecipeSchema = z.object({
	title: z.string().min(1).describe('Recipe title in plain text, no headings or formating.'),
	short_description: z
		.string()
		.min(1)
		.describe('Single sentence describing the recipe. Used in short form summaries.'),
	description: z
		.string()
		.nullable()
		.optional()
		.describe('Two to three sentence description with additional commentary or suggested pairings'),
	ingredients: z
		.string()
		.min(1)
		.describe(
			"Markdown dash-space list of ingredients. Optional '### Section' headings allowed for multi-part recipes. DO NOT use 'Ingredients' as a heading. No bullets (•)."
		),
	instructions: z
		.string()
		.min(1)
		.describe("Markdown numbered list of instructions. Optional '### Section' headings allowed for multi-part recipes. DO NOT use 'Instructions' as a heading. No H1/H2 headings."),
	tags: z
		.array(z.string().min(1))
		.describe('Use lowercase, hyphenate multi-word tags')
		.refine(
			(tags: string[]) => {
				return tags.some((t) => {
					const clean = t.trim().toLowerCase();
					return TAG_LOOKUP.has(clean) || ALL_TAGS.some((tag) => tag.toLowerCase().includes(clean));
				});
			},
			{ message: 'At least one recognized tag from any category is required.' }
		)
		.transform((tags: string[]) =>
			tags.map((t) => {
				const clean = t.trim().toLowerCase();
				return (
					TAG_LOOKUP.get(clean) || ALL_TAGS.find((tag) => tag.toLowerCase().includes(clean)) || t
				);
			})
		),
	yield: z
		.string()
		.nullable()
		.optional()
		.describe(
			"Number of servings for meals (e.g. 2 to 4 servings) or volume for sauces, dressings or similar, e.g. '2 cups"
		),
	time: z
		.object({
			prep: z
				.string()
				.nullable()
				.optional()
				.describe('Preparation time, may include marinating or chilling.'),
			cook: z.string().nullable().optional(),
			total: z.string().nullable().optional()
		})
		.nullable()
		.optional(),
	notes: z
		.string()
		.nullable()
		.optional()
		.describe('Plain Markdown. DO NOT use "Notes" as the heading.')
});

export type Recipe = z.infer<typeof RecipeSchema>;

export const RecipeSummarySchema = z.object({
	title: z.string().min(1),
	short_description: z.string().min(1)
});

export type RecipeSummary = z.infer<typeof RecipeSummarySchema>;
