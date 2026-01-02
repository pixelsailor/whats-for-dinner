/**
 * Recipe Types
 * 
 * Types for recipes and recipe management.
 */

import { z } from 'zod';

import type {
  CloudRecipeSchema,
  RecipeSchema,
  RecipeSummarySchema,
  SavedRecipeSchema,
  SuggestionHistorySchema,
} from './recipe.schemas';

export type RecipeSummary = z.infer<typeof RecipeSummarySchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
export type SavedRecipe = z.infer<typeof SavedRecipeSchema>;
export type CloudRecipe = z.infer<typeof CloudRecipeSchema>;
export type SuggestionHistory = z.infer<typeof SuggestionHistorySchema>;

/**
 * Suggestion stored in local database. Extends RecipeSummary and may contain
 * full recipe fields after the user views the suggestion.
 */
export type Suggestion = RecipeSummary & Partial<Recipe>;

/** @deprecated Use Recipe instead */
export type FullRecipe = z.infer<typeof RecipeSchema>;
