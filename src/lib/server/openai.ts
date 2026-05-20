/**
 * @fileoverview Deprecated re-exports for legacy OpenAI call sites.
 * @module lib/server/openai
 *
 * @deprecated Import from `$lib/api/ai/ai.server.service` instead. This module remains only
 * for transitional imports and will be removed after downstream migration.
 */

export {
  OPENAI_DISABLED_ERROR,
  appendRecipeDetails,
  appendRecipeDetailsWithContext as appendRecipeDetailsLegacy,
  askCookingQuestion,
  askCookingQuestionWithContext,
  generateRecipe,
  generateRecipeSuggestions,
  getFullRecipe,
  getRecipeSuggestions,
  requestRecipeModifications,
  requestRecipeModificationsWithContext
} from '$lib/api/ai/ai.server.service';
