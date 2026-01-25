import { AccountService } from '$lib/api/account';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();

  if (user) {
    const accountService = new AccountService(locals.supabase, user.id);
    try {
      const preferences = await accountService.getUserPreferences();
      return { preferences };
    } catch (error) {
      console.error('Failed to load user preferences', error);
      return fail(500, { error: 'Unable to load preferences' });
    }
  }
};
