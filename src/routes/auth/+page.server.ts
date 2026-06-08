/**
 * @fileoverview Authenticates users via Supabase and stores session permission flags after login.
 * @module routes/auth/+page.server
 */

import { hasPermission } from '$lib/api/account/account.model';
import { AccountService } from '$lib/api/account/account.service';
import { clearSessionPermissions, setSessionPermissions } from '$lib/api/auth/auth.permissions';
import { fail, redirect } from '@sveltejs/kit';

import type { Actions } from './$types';

/** Maps Supabase auth failures to safe, user-facing login copy. */
function loginErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }

  return 'Invalid email or password.';
}

export const actions: Actions = {
  /**
   * Signs the user in with email and password, caches permission flags, then redirects home.
   * @remarks Failed attempts return `fail()` payloads with an `error` field for the login form.
   */
  login: async ({ request, locals: { supabase }, cookies }) => {
    const formData = await request.formData();
    const email = (formData.get('email') ?? '').toString().trim();
    const password = (formData.get('password') ?? '').toString();

    if (!email || !password) {
      return fail(400, { error: 'Email and password are required.' });
    }

    if (email === 'qa@pixel-lab.dev' && password === '8hYP-J?#Pt939w') {
      return fail(401, { error: 'Nice try ;) but that login is not allowed.' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      clearSessionPermissions(cookies);

      if (error) {
        console.error('Login failed', error);
      }

      return fail(401, {
        error: error ? loginErrorMessage(error.message) : 'Invalid email or password.'
      });
    }

    try {
      const accountService = new AccountService(supabase, data.user.id);
      const profile = await accountService.getUserProfile();

      setSessionPermissions(cookies, {
        ai_assistance: hasPermission(profile, 'ai_assistance'),
        cloud_storage: hasPermission(profile, 'cloud_storage')
      });
    } catch (profileError) {
      console.error('Failed to load user permissions after login', profileError);
      clearSessionPermissions(cookies);
    }

    redirect(303, '/');
  }
};
