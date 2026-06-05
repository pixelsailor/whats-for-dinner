/**
 * Recipe Types
 *
 * Types for recipes and recipe management.
 */

import { z } from 'zod';

import type {
  CloudRecipeSchema,
  CloudRecipeSyncSummarySchema,
  RecipeSchema,
  RecipeSummarySchema,
  SavedRecipeSchema,
  SuggestionSchema
} from './recipe.schemas';

export type RecipeSummary = z.infer<typeof RecipeSummarySchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
export type SavedRecipe = z.infer<typeof SavedRecipeSchema>;
export type CloudRecipe = z.infer<typeof CloudRecipeSchema>;
/** Recipe summary row from Supabase `recipes` used during sync planning. */
export type CloudRecipeSyncSummary = z.infer<typeof CloudRecipeSyncSummarySchema>;
export type Suggestion = z.infer<typeof SuggestionSchema>;

/** @deprecated Use Recipe instead */
export type FullRecipe = z.infer<typeof RecipeSchema>;
