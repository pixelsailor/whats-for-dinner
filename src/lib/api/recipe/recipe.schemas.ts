/**
 * Recipe Schemas
 *
 * Zod schemas for recipes and recipe management.
 *
 * To ensure compatibility with the OpenAI Response API, all fields must be required.
 * "Optional" fields may be nullable. To conserve API tokens, avoid including fields that
 * are programmatically generated such as uuids or timestamps.
 *
 * Some fields are nullable to allow for AI assistance to fill in missing values.
 *
 * The Recipe schemas are considered "common" and may be imported by other schemas. To prevent
 * circular imports, DO NOT import domain schemas into this file.
 * Exception: {@link supabaseTimestamptzSchema} from `common` (no recipe dependency).
 */

import { supabaseTimestamptzSchema } from '$lib/api/common/common.schemas';
import { z } from 'zod';

export const CATEGORY_TAGS = {
  course: [
    'breakfast',
    'brunch',
    'lunch',
    'dinner',
    'dessert',
    'snack',
    'beverage',
    'main',
    'side',
    'light meal'
  ],
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
    'middle-eastern',
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
    'diabetic friendly',
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

export const RecipeRootSchema = z.object({
  title: z
    .string()
    .describe('Recipe title in plain text, no headings or formating.'),
  short_description: z
    .string()
    .nullable()
    .describe(
      'Single sentence describing the recipe. Used in short form summaries.'
    )
});

/**
 * Summary of a recipe used in lists and cards.
 * Do not use this schema for OpenAI responses. Use `AiSuggestionSchema` instead. See `$lib/api/ai/ai.schemas.ts`
 */
export const RecipeSummarySchema = RecipeRootSchema.extend({
  /** Primary id (UUID). Used to link to the suggestion in the suggestion history. */
  id: z.uuid(),
  created_at: supabaseTimestamptzSchema,
  last_opened: supabaseTimestamptzSchema.optional().nullable()
});

/**
 * Full recipe model used for display and editing. Several fields contain markdown strings.
 * Use `describe` to enforce zodResponseFormat for OpenAI responses.
 */
export const RecipeSchema = RecipeRootSchema.extend({
  description: z
    .string()
    .describe(
      'Two to three sentence description with additional commentary or suggested pairings'
    ),
  ingredients: z
    .string()
    .describe(
      "Markdown dash-space list of ingredients. Optional '### Section' headings allowed for multi-part recipes. DO NOT use 'Ingredients' as a heading. No bullets (•)."
    ),
  instructions: z
    .string()
    .describe(
      "Markdown numbered list of instructions. Optional '### Section' headings allowed for multi-part recipes. DO NOT use 'Instructions' as a heading. No H1/H2 headings."
    ),
  tags: z
    .array(z.string().min(1))
    .describe(
      `Use at least one tag from the following course tags: ${CATEGORY_TAGS.course.join(', ')} and one tag describing the main ingredient (e.g. 'chicken', 'tomato', 'chocolate'). Additional tags encouraged. Available tags include: ${ALL_TAGS.join(', ')}. DO NOT use capital letters.`
    ),
  yield: z
    .string()
    .describe(
      "Number of servings for meals (e.g. 2 to 4 servings) or volume for sauces, dressings or similar, e.g. 2 cups. Describe the yield -- don't just give a number."
    ),
  prep_time: z
    .array(z.string())
    .describe(
      'Preparation time in minutes, may include marinating or chilling. Use a second value for a range, e.g. "10-15 minutes" is represented as ["10", "15"]'
    ),
  cook_time: z
    .array(z.string())
    .describe(
      'Cooking time in minutes. Use a second value for a range, e.g. "10-15 minutes" is represented as ["10", "15"]'
    ),
  notes: z
    .string()
    .nullable()
    .describe('Plain Markdown. DO NOT use "Notes" as the heading.')
});

/**
 * Saved recipe model used for storage. Extends `RecipeSchema` with metadata used by the app for
 * recommendations, syncing, versioning, and sharing.
 */
export const SavedRecipeSchema = RecipeSchema.extend({
  /** Primary id (UUID). */
  id: z.uuid(),
  /** Creation timestamp. Automatically set by supabase trigger functions. */
  created_at: supabaseTimestamptzSchema,
  /** Update timestamp. Automatically set by supabase trigger functions. */
  updated_at: supabaseTimestamptzSchema.nullable(),
  /** Optional archived timestamp. Cloud backup: Recipe is not saved locally. Requires cloud_storage permission. */
  archived: supabaseTimestamptzSchema.nullable(),
  /** Optional deletion timestamp. */
  deleted_at: supabaseTimestamptzSchema.nullable(),
  /** Timestamp indicating when the recipe was last opened. */
  last_opened: supabaseTimestamptzSchema.nullable(),
  /** Monotonically increasing version number used for edits.
   * @todo Requires repo of recipe versions -- supabase users only
   */
  version: z.number(),
  /** Parent id for version history (if applicable). */
  parent_id: z.uuid().nullable(),
  /** Marks whether this row is the current active version. */
  is_current: z.boolean(),
  /** Whether the recipe is favorited in the UI. */
  is_favorite: z.boolean().nullable(),
  /** Owner id when synced to the cloud. Automatically set by supabase trigger functions. `owner_id` is required for cloud sync. */
  owner_id: z.uuid().nullable(),
  /** Shared id for public/shared recipes. */
  shared_id: z.string().nullable(),
  /** Whether the recipe has been synced to remote. */
  synced: z.boolean().nullable(),
  /** Last sync timestamp. Automatically set by supabase trigger functions. */
  last_synced_at: supabaseTimestamptzSchema.nullable(),
  /** Error message from last sync attempt, if any. */
  sync_error: z.string().nullable(),
  /** History of checkout/made this today dates as ISO-8601 calendar dates (`YYYY-MM-DD`), no timestamp. */
  checkout_history: z.array(z.iso.date()).nullable()
});

/** Fields returned by {@link CloudService.getAllRecipeSummaries} for sync comparison. */
export const CloudRecipeSyncSummarySchema = RecipeRootSchema.extend({
  id: z.uuid(),
  last_synced_at: supabaseTimestamptzSchema
});

/**
 * Cloud `recipes` row with required `owner_id`.
 * @remarks Invalid legacy rows must be corrected in product UI — see **CLD-4** in `docs/api-layer-filename-alignment-gaps.md`.
 */
export const CloudRecipeSchema = SavedRecipeSchema.extend({
  /** Owner id when synced to the cloud. Automatically set by supabase trigger functions. */
  owner_id: z.uuid()
});

/**
 * Suggestion model used for storing suggestions in the local database. Extends `SavedRecipeSchema`
 * with metadata used by the app for tracking suggestion creation and last opened.
 *
 * `recipe_id` is a nullable link to the user's saved recipe (if the suggestion was saved into My Recipes).
 */
export const SuggestionSchema = SavedRecipeSchema.partial().extend({
  ...RecipeSummarySchema.shape,
  recipe_id: z.uuid().nullable()
});
