import { type Actions, fail } from '@sveltejs/kit';
import DOMPurify from 'isomorphic-dompurify';
import type { PageServerLoad } from './$types';

import { AccountService } from '$lib/api/account';
import { AiParseError, parseRecipeDetail } from '$lib/api/ai/ai.model';
import {
  appendRecipeDetails,
  parseRecipeFromText
} from '$lib/api/ai/ai.server.service';
import {
  OPENAI_DISABLED_ERROR,
  parseRecipeFromPageContent
} from '$lib/api/ai/ai.server.service';
import { RecipeImportError } from '$lib/api/recipe-import/recipe-import.errors';
import { fetchAndPrepareRecipeImport } from '$lib/api/recipe-import/recipe-import.service';
import type { Recipe } from '$lib/api/recipe/recipe.types';
import { RecipeSchema } from '$lib/api/recipe/recipe.schemas';

export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession();

  if (!user) {
    return { preferences: null, preferencesLoadError: null };
  }

  const accountService = new AccountService(locals.supabase, user.id);
  try {
    const preferences = await accountService.getUserPreferences();
    return { preferences, preferencesLoadError: null };
  } catch (error) {
    console.error('Failed to load user preferences', error);
    return {
      preferences: null,
      preferencesLoadError: 'Unable to load preferences'
    };
  }
};

const FEATURE_ID = 'recipe-import-url';

/**
 * Normalizes a recipe URL for server-side import. Do XSS validation here.
 * @param raw - User-provided URL string
 * @returns URL with an http(s) scheme when missing
 */
function normalizeImportUrl(raw: string): string {
  const clean = DOMPurify.sanitize(raw);

  if (/^https?:\/\//i.test(clean)) {
    return clean;
  }

  return `https://${clean}`;
}

export const actions = {
  /** Handle primary form submission */
  viaform: async ({ request }) => {
    const recipeData = await request.formData();
    const cleanedRecipeData: Recipe = {} as Recipe;
    recipeData.forEach((value: FormDataEntryValue, key: string) => {
      if (typeof value === 'string') {
        // Since some fields are arrays, we need to use the unknown type to avoid type errors
        (cleanedRecipeData as unknown as Record<string, string>)[key] =
          DOMPurify.sanitize(value.toString().trim());
      }
    });

    /** Add the arrays back that DOMPurify skipped */
    cleanedRecipeData.prep_time = recipeData.getAll('prep_time') as string[];
    cleanedRecipeData.cook_time = recipeData.getAll('cook_time') as string[];
    cleanedRecipeData.tags = recipeData.getAll('tags') as string[];

    const zodRecipe = RecipeSchema.safeParse(cleanedRecipeData);

    if (!zodRecipe.success) {
      return fail(400, { error: 'Invalid request body' });
    }

    try {
      const recipe = await appendRecipeDetails(
        JSON.stringify(cleanedRecipeData)
      );
      return JSON.parse(recipe);
    } catch (err) {
      if (err instanceof AiParseError) {
        return fail(502, { error: err.message });
      }

      throw err;
    }
  },

  /** Import a recipe from a URL */
  viaurl: async ({ request, locals }) => {
    const { permissions } = locals;
    const formData = await request.formData();
    const rawUrl = formData.get('recipe_url')?.toString();

    if (!rawUrl) {
      return fail(400, { error: 'URL is required' });
    }

    const cleanedUrl = DOMPurify.sanitize(rawUrl, {
      ALLOWED_URI_REGEXP:
        /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i
    });

    if (!cleanedUrl) {
      return fail(400, { error: 'Invalid URL' });
    }

    const url = normalizeImportUrl(cleanedUrl);

    const aiAllowed = Boolean(permissions?.ai_assistance);

    if (!aiAllowed) {
      return fail(403, { error: 'AI access denied' });
    }

    try {
      const prepared = await fetchAndPrepareRecipeImport(url);

      console.info(FEATURE_ID, {
        stage: 'prepared',
        source: prepared.preparationSource,
        primaryChars: prepared.primaryBlock.length,
        sanitizedBodyChars: prepared.sanitizedBodyContent.length
      });

      const raw = await parseRecipeFromPageContent(
        prepared,
        prepared.sourceUrl
      );

      return parseRecipeDetail(raw);
    } catch (err) {
      if (err instanceof RecipeImportError) {
        console.info(FEATURE_ID, { stage: 'failed', code: err.code });

        return fail(err.httpStatus, { error: err.message });
      }

      if (err instanceof AiParseError) {
        return fail(502, { error: err.message });
      }

      if (err instanceof Error && err.message === OPENAI_DISABLED_ERROR) {
        return fail(503, { error: 'AI service is unavailable right now' });
      }

      console.error(`${FEATURE_ID} failed`, err);

      return fail(500, {
        error: err instanceof Error ? err.message : 'Failed to import recipe'
      });
    }
  },

  /** Import a recipe from a single string of text */
  viatext: async ({ request, locals }) => {
    const { permissions } = locals;
    const formData = await request.formData();
    const rawRecipeBlock = formData.get('recipe_block')?.toString();

    if (!rawRecipeBlock) {
      return fail(400, { error: 'Recipe content is required' });
    }

    const aiAllowed = Boolean(permissions?.ai_assistance);

    if (!aiAllowed) {
      return fail(403, { error: 'AI access denied' });
    }

    try {
      const raw = await parseRecipeFromText(rawRecipeBlock);

      return parseRecipeDetail(raw);
    } catch (err) {
      if (err instanceof AiParseError) {
        return fail(502, { error: err.message });
      }

      if (err instanceof Error && err.message === OPENAI_DISABLED_ERROR) {
        return fail(503, { error: 'AI service is unavailable right now' });
      }

      console.error(`${FEATURE_ID} failed`, err);

      return fail(500, {
        error: err instanceof Error ? err.message : 'Failed to import recipe'
      });
    }
  }
} satisfies Actions;
