import { isBrowser } from '@supabase/ssr';
import { AuthService } from '$lib/api/auth';
import {
  createLayoutBrowserClient,
  createLayoutServerClient
} from '$lib/api/session';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
  /**
   * Declare a dependency so the layout can be invalidated, for example, on
   * session refresh.
   */
  depends('supabase:auth');

  const browser = isBrowser();
  const supabase = browser
    ? createLayoutBrowserClient(fetch)
    : createLayoutServerClient(
        {
          getAll() {
            return data.cookies;
          }
        },
        fetch
      );

  if (!browser) {
    return {
      ...data,
      supabase
    };
  }

  const authService = new AuthService(supabase);
  const { session, user } = await authService.getValidatedSession();

  if (!session) {
    await authService.clearStaleSession();
  }

  // Forward server-provided data (permissions, feature flags, cookies, etc.)
  return {
    ...data,
    session,
    supabase,
    user
  };
};
