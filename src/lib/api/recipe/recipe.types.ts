/**
 * Recipe Types
 * 
 * Types for recipes and recipe management.
 */

import { z } from 'zod';

import type { RecipeSummarySchema, RecipeSchema, SavedRecipeSchema } from './recipe.schemas';

export type RecipeSummary = z.infer<typeof RecipeSummarySchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
export type SavedRecipe = z.infer<typeof SavedRecipeSchema>;

/** @deprecated Use Recipe instead */
export type FullRecipe = z.infer<typeof RecipeSchema>;
