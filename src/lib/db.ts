import Dexie, { type Table } from 'dexie';
import type { SavedRecipe, Suggestion } from './api/recipe';

/**
 * Local Dexie/IndexedDB Database
 * 
 * Master database records for the What's For Dinner application.
 * 
 * Stores all recipes (except archived recipes) regardless of user authentication status.
 * 
 * By virtue of `ai_assistance` permission requirements, `suggestions` may only be stored for authenticated users.
 */
class MealDexie extends Dexie {
	recipes!: Table<SavedRecipe, string>;
	suggestions!: Table<Suggestion, string>;

	constructor() {
		super('meal_assistant');

		this.version(1).stores({
			recipes:
				'id, title, created_at, deleted_at, last_opened, owner_id, shared_id, synced, last_synced_at',
			suggestions: 'id, sid, created_at, last_opened',
		});
	}
}

export const db = new MealDexie();
