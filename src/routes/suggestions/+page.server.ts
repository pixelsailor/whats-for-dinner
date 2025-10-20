import { redirect } from '@sveltejs/kit';
import { browser } from '$app/environment';
import getUserPreferences from '$lib/utils/getUserPreferences';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
  const { session, permissions } = await parent();
  
  // Guard: redirect if user doesn't have ai-assisted-recipe permission
  if (!permissions.aiAssistedRecipe.allowed) {
    redirect(303, '/auth');
  }
  
  if (!browser) return { preferences: null };
  
  const preferences = await getUserPreferences();
  return { preferences };
};
