import Dexie, { type Table } from 'dexie';
import type { PantryItem, SavedRecipe, Suggestion } from './types';

class MealDexie extends Dexie {
	recipes!: Table<SavedRecipe, string>;
	suggestions!: Table<Suggestion, string>;
	pantry!: Table<PantryItem, string>;

	constructor() {
		super('meal_assistant');

		this.version(1).stores({
			recipes: 'id, title, created_at, archived, last_opened',
			suggestions: 'id, created_at',
			pantry: 'id, name, added_at'
		});
	}
}

export const db = new MealDexie();
