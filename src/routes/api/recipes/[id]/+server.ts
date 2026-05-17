/**
 * @fileoverview HTTP GET for loading a single cloud recipe by primary id (owner-scoped) or by public `shared_id`.
 * @module routes/api/recipes/[id]/server
 */

import { error, json } from '@sveltejs/kit';

import { CloudService } from '$lib/api/cloud';

import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals, params }) => {
  const shared = url.searchParams.get('shared');
  const idFromQuery = url.searchParams.get('id');
  const recipeId = idFromQuery ?? params.id;

  const { supabase, user } = locals;

  try {
    if (shared) {
      const cloud = new CloudService(supabase, user?.id ?? '');
      const recipe = await cloud.downloadRecipeBySharedId(shared);
      if (!recipe) {
        throw error(404, 'Recipe not found');
      }
      return json({ recipe });
    }

    if (recipeId) {
      if (!user) {
        throw error(401, 'Authentication required');
      }
      const cloud = new CloudService(supabase, user.id);
      const recipe = await cloud.downloadRecipeById(recipeId);
      if (!recipe) {
        throw error(404, 'Recipe not found');
      }
      return json({ recipe });
    }

    throw error(400, 'Provide a recipe id (path or query) or a shared token (?shared=).');
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return json({ error: message }, { status: 500 });
  }
};
