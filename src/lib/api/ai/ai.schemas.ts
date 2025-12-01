/**
 * AI Schemas
 * 
 * Contains the schemas for interacting with the OpenAI API.
 */

import { z } from 'zod';
import { RecipeSummarySchema } from '../recipe/recipe.schemas';

export const RecipeSuggestionsResponseSchema = z.array(RecipeSummarySchema);
