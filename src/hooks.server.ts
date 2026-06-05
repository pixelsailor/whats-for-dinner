import { AuthService } from '$lib/api/auth';
import { createRequestServerClient, isSessionSerializedResponseHeader } from '$lib/api/session';
import { getSessionPermissions } from '$lib/utils/session';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const supabase: Handle = async ({ event, resolve }) => {
  /**
   * Creates a Supabase client specific to this server request.
   *
   * The Supabase client gets the Auth token from the request cookies.
   */
  event.locals.supabase = createRequestServerClient({
    getAll: () => event.cookies.getAll(),
    /**
     * SvelteKit's cookies API requires `path` to be explicitly set in
     * the cookie options. Setting `path` to `/` replicates previous/
     * standard behavior.
     */
    setAll: (cookiesToSet) => {
      cookiesToSet.forEach(({ name, value, options }) => {
        event.cookies.set(name, value, { ...options, path: '/' });
      });
    }
  });

  /**
   * Unlike `supabase.auth.getSession()`, which returns the session _without_
   * validating the JWT, this function also calls `getUser()` to validate the
   * JWT before returning the session.
   */
  event.locals.safeGetSession = () => new AuthService(event.locals.supabase).getValidatedSession();

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      /**
       * Supabase libraries use the `content-range` and `x-supabase-api-version`
       * headers, so we need to tell SvelteKit to pass it through.
       */
      return isSessionSerializedResponseHeader(name);
    }
  });
};

/**
 * Authentication Guard
 *
 * Protects routes from unauthorized access.
 * Redirects to the home page if the user is not authenticated.
 */
const authGuard: Handle = async ({ event, resolve }) => {
  const { session, user } = await event.locals.safeGetSession();
  event.locals.session = session;
  event.locals.user = user;
  event.locals.permissions = session ? getSessionPermissions(event.cookies) : null;

  if (event.locals.session && event.url.pathname === '/auth') {
    throw redirect(303, '/');
  }

  return resolve(event);
};
export const handle: Handle = sequence(supabase, authGuard);
