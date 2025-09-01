import { z } from 'zod';

const CATEGORY_TAGS = {
	course: ['breakfast', 'brunch', 'lunch', 'dinner', 'dessert', 'snack', 'beverage'],
	cuisine: [
		'american',
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
		'spanish'
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
		'whole30'
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
		'sous vide'
	],
	occasion: ['holiday', 'birthday', 'party', 'picnic', 'weeknight', 'romantic']
};

// Create a case-insensitive lookup map
const ALL_TAGS = Object.values(CATEGORY_TAGS).flat();
const TAG_LOOKUP = new Map(ALL_TAGS.map((tag) => [tag.toLowerCase(), tag]));

export const RecipeSchema = z.object({
	title: z.string().min(1),
	short_description: z.string().min(1),
	description: z.string().nullable().optional(),
	ingredients: z.string().min(1), // Markdown
	instructions: z.string().min(1), // Markdown
	// tags: z.array(z.string().min(1)),
	tags: z
  .array(z.string().min(1))
  .refine(
    (tags: string[]) => {
      return tags.some((t) => {
        const clean = t.trim().toLowerCase();
        return TAG_LOOKUP.has(clean) || ALL_TAGS.some(tag => tag.toLowerCase().includes(clean));
      });
    },
    { message: 'At least one recognized tag from any category is required.' }
  )
  .transform((tags: string[]) =>
    tags.map((t) => {
      const clean = t.trim().toLowerCase();
      return TAG_LOOKUP.get(clean) || ALL_TAGS.find((tag) => tag.toLowerCase().includes(clean)) || t;
    })
  ),
	yield: z.string().nullable().optional(),
	time: z
		.object({
			prep: z.string().nullable().optional(),
			cook: z.string().nullable().optional(),
			total: z.string().nullable().optional()
		})
		.nullable()
		.optional(),
	notes: z.string().nullable().optional() // Markdown
});

export type Recipe = z.infer<typeof RecipeSchema>;

export const RecipeSummarySchema = z.object({
	title: z.string().min(1),
	short_description: z.string().min(1)
});

export type RecipeSummary = z.infer<typeof RecipeSummarySchema>;
