import { db } from '$lib/db/local';
import type { UserPreferences } from '$lib/types';
import { createLiveQueryStore } from './_utils';

export const preferences = createLiveQueryStore(async () => {
  return await db.preferences.get('preferences');
});

export const updatePreferences = async (updates: Partial<UserPreferences>) => {
	const current = await db.preferences.get('preferences');
	await db.preferences.put({ ...current, ...updates, id: 'preferences' });
}
