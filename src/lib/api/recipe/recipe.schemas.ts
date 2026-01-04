/**
 * Recipe Schemas
 *
 * Zod schemas for recipes and recipe management.
 *
 * To ensure compatibility with the OpenAI Response API, all fields must be required.
 * "Optional" fields may be nullable. To conserve API tokens, avoid including fields that
 * are programmatically generated such as uuids or timestamps.
 *
 * The Recipe schemas are considered "common" and may be imported by other schemas. To prevent
 * circular imports, DO NOT import any other schemas into this file.
 */

import { z } from 'zod';

const CATEGORY_TAGS = {
	course: ['breakfast', 'brunch', 'lunch', 'dinner', 'dessert', 'snack', 'beverage', 'main', 'side', 'light-meal'],
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
// const TAG_LOOKUP = new Map(ALL_TAGS.map((tag) => [tag.toLowerCase(), tag]));

export const RecipeRootSchema = z.object({
	title: z.string(),
	short_description: z.string()
});

/**
 * Summary of a recipe used in lists and cards.
 * Do not use this schema for OpenAI responses. Use `AiSuggestionSchema` instead. See `$lib/api/ai/ai.schemas.ts`
 */
export const RecipeSummarySchema = RecipeRootSchema.extend({
	sid: z.string().describe('Suggestion ID. Used to link to the suggestion in the suggestion history.'),
	created_at: z.iso.datetime(),
	last_opened: z.iso.datetime().optional()
});

/**
 * Full recipe model used for display and editing. Several fields contain markdown strings.
 * Use `describe` to enforce zodResponseFormat for OpenAI responses.
 */
export const RecipeSchema = RecipeRootSchema.extend({
	description: z.string().nullable().describe('Two to three sentence description with additional commentary or suggested pairings'),
	ingredients: z
		.string()
		.min(1)
		.describe(
			"Markdown dash-space list of ingredients. Optional '### Section' headings allowed for multi-part recipes. DO NOT use 'Ingredients' as a heading. No bullets (•)."
		),
	instructions: z
		.string()
		.min(1)
		.describe(
			"Markdown numbered list of instructions. Optional '### Section' headings allowed for multi-part recipes. DO NOT use 'Instructions' as a heading. No H1/H2 headings."
		),
	tags: z
		.array(z.string().min(1))
		.describe(
			`Use lowercase, hyphenate multi-word tags. Use at least one tag from the following course tags: ${CATEGORY_TAGS.course.join(', ')}. Additional tags encouraged. Available tags include: ${ALL_TAGS.join(', ')}.`
		),
	yield: z.string().describe("Number of servings for meals (e.g. 2 to 4 servings) or volume for sauces, dressings or similar, e.g. '2 cups"),
	prep_time: z
		.array(z.string())
		.describe(
			'Preparation time in minutes, may include marinating or chilling. Use a tuple for range values, e.g. "10-15 minutes" is represented as ["10", "15"]'
		),
	cook_time: z.array(z.string()).describe('Cooking time in minutes. Use a tuple for range values, e.g. "10-15 minutes" is represented as ["10", "15"]'),
	notes: z.string().nullable().describe('Plain Markdown. DO NOT use "Notes" as the heading.')
});

/**
 * Saved recipe model used for storage. Extends `RecipeSchema` with metadata used by the app for
 * recommendations, syncing, versioning, and sharing.
 */
export const SavedRecipeSchema = RecipeSchema.extend({
	/** Primary id (UUID). */
	id: z.uuid(),
	/** Creation timestamp. Automatically set by supabase trigger functions. */
	created_at: z.iso.datetime(),
	/** Update timestamp. Automatically set by supabase trigger functions. */
	updated_at: z.iso.datetime().nullable(),
	/** Optional archived timestamp. Cloud backup: Recipe is not saved locally. Requires cloud_storage permission. */
	archived: z.iso.datetime().nullable(),
	/** Optional deletion timestamp. */
	deleted_at: z.iso.datetime().nullable(),
	/** Timestamp indicating when the recipe was last opened. */
	last_opened: z.iso.datetime(),
	/** Monotonically increasing version number used for edits.
	 * @todo Requires repo of recipe versions -- supabase users only
	 */
	version: z.number(),
	/** Parent id for version history (if applicable). */
	parent_id: z.uuid().nullable(),
	/** Marks whether this row is the current active version. */
	is_current: z.boolean(),
	/** Whether the recipe is favorited in the UI. */
	is_favorite: z.boolean(),
	/** Owner id when synced to the cloud. Automatically set by supabase trigger functions. */
	owner_id: z.uuid().nullable(),
	/** Shared id for public/shared recipes. */
	shared_id: z.string().nullable(),
	/** Whether the recipe has been synced to remote. */
	synced: z.boolean().nullable(),
	/** Last sync timestamp. Automatically set by supabase trigger functions. */
	last_synced_at: z.iso.datetime().nullable(),
	/** Error message from last sync attempt, if any. */
	sync_error: z.string().nullable()
});

export const CloudRecipeSchema = SavedRecipeSchema.extend({
	/** Owner id when synced to the cloud. Automatically set by supabase trigger functions. */
	owner_id: z.uuid()
});

/**
 * Suggestion model used for storing suggestions in the local database. Extends `SavedRecipeSchema`
 * with metadata used by the app for tracking suggestion creation and last opened.
 *
 * @todo - ID is being generated as a concatenation of the prompt and title. Devise a way to
 * use a proper UUID to facilitate linking to saved recipes from the suggestion history.
 */
export const SuggestionSchema = SavedRecipeSchema.partial().extend(RecipeSummarySchema.shape);
