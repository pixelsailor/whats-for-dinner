import type { LayoutServerLoad } from './$types';
import { checkPolicy } from '$lib/utils/permissions';
import { VITE_OPENAI_API_KEY } from '$env/static/private';

export const load: LayoutServerLoad = async ({ locals: { safeGetSession }, cookies }) => {
	const { session } = await safeGetSession();

	// Calculate permissions
	const permissions = {
		cloudSync: checkPolicy(session, 'cloud-sync'),
		aiAssistedRecipe: checkPolicy(session, 'ai-assisted-recipe')
	};

	return {
		session,
		permissions,
		featureFlags: {
			openai: Boolean(VITE_OPENAI_API_KEY)
		},
		cookies: cookies.getAll()
	};
};