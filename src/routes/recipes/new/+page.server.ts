import { AccountService } from '$lib/api/account';
import type { PageServerLoad } from './$types';

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
    return { preferences: null, preferencesLoadError: 'Unable to load preferences' };
  }
};
