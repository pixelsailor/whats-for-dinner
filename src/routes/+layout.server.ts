import { VITE_OPENAI_API_KEY } from '$env/static/private';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	const { session } = await locals.safeGetSession();
	const permissionFlags = locals.permissions ?? null;

	const permissions = {
		cloudSync: { allowed: permissionFlags?.cloud_storage ?? false },
		aiAssistedRecipe: { allowed: permissionFlags?.ai_assistance ?? false }
	};

	return {
		session,
		permissions,
		permissionFlags,
		featureFlags: {
			openai: Boolean(VITE_OPENAI_API_KEY)
		},
		cookies: cookies.getAll()
	};
};