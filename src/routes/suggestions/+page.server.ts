import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { session, permissions, featureFlags } = await parent();

	return {
		session,
		permissions,
		featureFlags
	};
};
