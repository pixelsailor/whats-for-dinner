import { browser } from '$app/environment';
import getUserPreferences from '$lib/utils/getUserPreferences';

export const load = async () => {
  if (!browser) return;
  
	const preferences = await getUserPreferences();
	return { preferences };
};
