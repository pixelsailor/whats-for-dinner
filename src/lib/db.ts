import Dexie, { type Table } from 'dexie';
import type { PantryItem, SavedRecipe } from './types';

class MealDexie extends Dexie {
	recipes!: Table<SavedRecipe, string>;
	pantry!: Table<PantryItem, string>;

	constructor() {
		super('meal_assistant');
		this.version(1).stores({
			recipes: 'id, title, created_at, archived, last_opened',
			pantry: 'id, name, added_at'
		});
	}
}

export const db = new MealDexie();
