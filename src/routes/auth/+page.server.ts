import { hasPermission } from '$lib/api/account/account.model';
import { AccountService } from '$lib/api/account/account.service';
import { clearSessionPermissions, setSessionPermissions } from '$lib/utils/session';
import { fail, redirect } from '@sveltejs/kit';

import type { Actions } from './$types';

/**
 * Login Page Server Actions
 *
 * Contains server actions for authenticating users using the Supabase auth client.
 * After successful login, the user profile is fetched and permissions are stored
 * in the session for downstream access.
 */
export const actions: Actions = {
  /**
   * User Login
   *
   * Uses Supabase auth client to sign in the user with email and password.
   * Retrieves the user's permissions and stores them in a session cookie.
   * Redirects to the home page if successful, otherwise displays the error message.
   */
  login: async ({ request, locals: { supabase }, cookies }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      clearSessionPermissions(cookies);
      return fail(401, { error: error.message });
    }

    try {
      const userId = data.user?.id;

      if (userId) {
        const accountService = new AccountService(supabase, userId);
        const profile = await accountService.getUserProfile();

        setSessionPermissions(cookies, {
          ai_assistance: hasPermission(profile, 'ai_assistance'),
          cloud_storage: hasPermission(profile, 'cloud_storage')
        });
      } else {
        clearSessionPermissions(cookies);
      }
    } catch (profileError) {
      console.error('Failed to load user permissions after login', profileError);
      clearSessionPermissions(cookies);
    }

    redirect(303, '/');
  }
};
