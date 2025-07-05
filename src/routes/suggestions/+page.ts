import { browser } from '$app/environment';
import getUserPreferences from '$lib/utils/getUserPreferences';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
  if (!browser) return;
  
	const preferences = await getUserPreferences();
	return { preferences };
};
