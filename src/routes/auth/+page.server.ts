/**
 * Login Page Server Actions
 * 
 * Contains server actions for authenticating users using the Supabase auth client.
 * 
 * After successful login, the user profile is fetched and stored in the session. User data
 * can then be accessed via the `locals.user` object.
 */

import { fail, redirect } from '@sveltejs/kit'

import type { Actions } from './$types'

export const actions: Actions = {
  // signup: async ({ request, locals: { supabase } }) => {
  //   const formData = await request.formData()
  //   const email = formData.get('email') as string
  //   const password = formData.get('password') as string

  //   const { error } = await supabase.auth.signUp({ email, password })
  //   if (error) {
  //     console.error(error)
  //     redirect(303, '/auth/error')
  //   } else {
  //     redirect(303, '/')
  //   }
  // },
  /**
   * User Login
   * 
   * Uses Supabase auth client to sign in the user with email and password.
   * Redirects to the home page if successful, otherwise displays the error message.
   */
  login: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return fail(401, { error: error.message });
    } else {
      redirect(303, '/');
    }
  },
}