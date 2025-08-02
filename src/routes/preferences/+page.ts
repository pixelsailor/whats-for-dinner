import { browser } from '$app/environment';
import { db } from '$lib/db/local';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	if (!browser) return;

	const data = await db.preferences.get('preferences');
	return { db: data };
};
