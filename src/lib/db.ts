import Dexie, { type Table } from 'dexie';
import type { SavedRecipe, Suggestion, UserPreferences } from './types';

class MealDexie extends Dexie {
	recipes!: Table<SavedRecipe, string>;
	suggestions!: Table<Suggestion, string>;
	// pantry!: Table<PantryItem, string>;
	preferences!: Table<UserPreferences, string>;

	constructor() {
		super('meal_assistant');

		this.version(2).stores({
			recipes:
				'id, title, created_at, deleted_at, last_opened, owner_id, shared_id, synced, last_synced_at',
			suggestions: 'id, created_at',
			// pantry: 'id, name, added_at',
			preferences: 'id'
		});
	}
}

export const db = new MealDexie();
