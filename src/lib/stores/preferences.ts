/**
 * Preferences Store
 *
 * Handles the user's preferences for recipe suggestions and instructions.
 *
 * @deprecated Use AccountService instead. @see src/lib/api/account/account.service.ts
 */

import { db } from '$lib/db';
import type { UserPreferences } from '$lib/types';
import { createLiveQueryStore } from './_utils';

export const preferences = createLiveQueryStore(async () => {
  return await db.preferences.get('preferences');
});

export const updatePreferences = async (updates: Partial<UserPreferences>) => {
  const current = await db.preferences.get('preferences');
  await db.preferences.put({ ...current, ...updates, id: 'preferences' });
};
