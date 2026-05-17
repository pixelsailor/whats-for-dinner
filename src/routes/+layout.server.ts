import { OPENAI_API_KEY } from '$env/static/private';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies, depends }) => {
  depends('supabase:auth');

  const { session, user } = await locals.safeGetSession();
  const permissionFlags = locals.permissions ?? null;

  const permissions = {
    cloudSync: { allowed: permissionFlags?.cloud_storage ?? false },
    aiAssistedRecipe: { allowed: permissionFlags?.ai_assistance ?? false }
  };

  return {
    session,
    user,
    permissions,
    permissionFlags,
    featureFlags: {
      openai: Boolean(OPENAI_API_KEY)
    },
    cookies: cookies.getAll()
  };
};
