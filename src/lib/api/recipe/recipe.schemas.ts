/**
 * Recipe Schemas
 * 
 * Zod schemas for recipes and recipe management.
 */

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

/**
 * Summary of a recipe used in lists and cards.
 */
export const RecipeSummarySchema = z.object({
  title: z.string().min(1).describe('Recipe title in plain text, no headings or formating.'),
  short_description: z.string().optional().describe('Single sentence describing the recipe. Used in short form summaries.'),
  id: z.uuid().optional(),
});

/**
 * Full recipe model used for display and editing. Several fields contain markdown strings.
 * Use `describe` to enforce zodResponseFormat for OpenAI responses.
 */
export const RecipeSchema = RecipeSummarySchema.extend({
  description: z.string().optional().describe('Two to three sentence description with additional commentary or suggested pairings'),
  ingredients: z
    .string()
    .min(1)
    .describe(
      "Markdown dash-space list of ingredients. Optional '### Section' headings allowed for multi-part recipes. DO NOT use 'Ingredients' as a heading. No bullets (•)."
    ),
  instructions: z.string()
    .min(1)
    .describe("Markdown numbered list of instructions. Optional '### Section' headings allowed for multi-part recipes. DO NOT use 'Instructions' as a heading. No H1/H2 headings."),
  tags: z.
    array(z.string().min(1))
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
        return TAG_LOOKUP.get(clean) || ALL_TAGS.find((tag) => tag.toLowerCase().includes(clean)) || t;
      })
    ),
  yield: z.string().optional().describe(
    "Number of servings for meals (e.g. 2 to 4 servings) or volume for sauces, dressings or similar, e.g. '2 cups"
  ),
  time: z.object({
    prep: z.string().optional().describe('Preparation time, may include marinating or chilling.'),
    cook: z.string().optional(),
    total: z.string().optional(),
  }).optional(),
  notes: z.string().optional().describe('Plain Markdown. DO NOT use "Notes" as the heading.')
});

/**
 * Saved recipe model used for storage. Extends `RecipeSchema` with metadata used by the app for 
 * recommendations, syncing, versioning, and sharing.
 */
export const SavedRecipeSchema = RecipeSchema.extend({
  /** Primary id (UUID). */
  id: z.uuid(),
  /** Creation timestamp. */
  created_at: z.coerce.date(),
  /** Update timestamp. */
  updated_at: z.coerce.date().nullable().optional(),
  /** Optional archived timestamp. Cloud backup: Recipe is not saved locally.
   * @todo This would require another db to tracking archived recipes -- supabase users only
   */
  archived: z.coerce.date().optional(),
  /** Optional deletion timestamp. */
  deleted_at: z.coerce.date().optional(),
  /** Timestamp indicating when the recipe was last opened. */
  last_opened: z.coerce.date(),
  /** Monotonically increasing version number used for edits.
   * @todo Requires repo of recipe versions -- supabase users only
   */
  version: z.number(),
  /** Parent id for version history (if applicable). */
  parent_id: z.uuid().optional(),
  /** Marks whether this row is the current active version. */
  is_current: z.boolean(),
  /** Whether the recipe is favorited in the UI. */
  is_favorite: z.boolean(),
  /** Owner id when synced to the cloud (supabase). */
  owner_id: z.uuid(),
  /** Shared id for public/shared recipes. */
  shared_id: z.string().optional(),
  /** Whether the recipe has been synced to remote. */
  synced: z.boolean().optional(),
  /** Last sync timestamp. */
  last_synced_at: z.coerce.date().optional(),
  /** Error message from last sync attempt, if any. */
  sync_error: z.string().optional(),
});
