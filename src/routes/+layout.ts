import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
  /**
   * Declare a dependency so the layout can be invalidated, for example, on
   * session refresh.
   */
  depends('supabase:auth');

  const browser = isBrowser();
  const supabase = browser
    ? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
        global: {
          fetch
        }
      })
    : createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
        global: {
          fetch
        },
        cookies: {
          getAll() {
            return data.cookies;
          }
        }
      });

  if (!browser) {
    return {
      ...data,
      supabase
    };
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  // Forward server-provided data (permissions, feature flags, cookies, etc.)
  return {
    ...data,
    session,
    supabase,
    user
  };
};
