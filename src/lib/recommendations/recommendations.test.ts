import { describe, expect, it } from 'vitest';

import type { SavedRecipe } from '$lib/api/recipe';

import {
	categorizeRecipes,
	filterRecommendableRecipes,
	getLastCheckoutMs,
	shuffleAndTake
} from './recommendations';

const msPerDay = 1000 * 60 * 60 * 24;

function recipe(partial: Partial<SavedRecipe> & Pick<SavedRecipe, 'id' | 'title'>): SavedRecipe {
	return {
		short_description: null,
		tags: [],
		is_favorite: false,
		checkout_history: [],
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString(),
		last_opened: null,
		deleted_at: null,
		is_current: true,
		...partial
	} as SavedRecipe;
}

describe('filterRecommendableRecipes', () => {
	it('excludes soft-deleted and non-current rows', () => {
		const rows = [
			recipe({ id: '1', title: 'A', deleted_at: null, is_current: true }),
			recipe({ id: '2', title: 'B', deleted_at: '2020-01-01T00:00:00.000Z', is_current: true }),
			recipe({ id: '3', title: 'C', deleted_at: null, is_current: false })
		];
		const out = filterRecommendableRecipes(rows);
		expect(out.map((r) => r.id)).toEqual(['1']);
	});
});

describe('getLastCheckoutMs', () => {
	it('returns the latest valid checkout timestamp', () => {
		const t1 = '2024-01-01T00:00:00.000Z';
		const t2 = '2025-06-01T12:00:00.000Z';
		const r = recipe({ id: '1', title: 'X', checkout_history: [t1, t2] });
		expect(getLastCheckoutMs(r)).toBe(Date.parse(t2));
	});

	it('returns null when there is no history', () => {
		expect(getLastCheckoutMs(recipe({ id: '1', title: 'X', checkout_history: [] }))).toBeNull();
	});
});

describe('categorizeRecipes', () => {
	it('does not mutate the input array when ranking popular', () => {
		const rows = [
			recipe({ id: '1', title: 'Low', checkout_history: ['2020-01-01T00:00:00.000Z'] }),
			recipe({ id: '2', title: 'High', checkout_history: ['2020-01-01T00:00:00.000Z', '2020-02-01T00:00:00.000Z'] })
		];
		const orderBefore = rows.map((r) => r.id);
		categorizeRecipes(rows, { mealTag: null, useMealContext: false });
		expect(rows.map((r) => r.id)).toEqual(orderBefore);
	});

	it('places last-cook 5 months ago only in the 2–6 month bucket, not the 6+ bucket', () => {
		const now = Date.now();
		const fiveMonthsAgo = new Date(now - 150 * msPerDay).toISOString();
		const r = recipe({
			id: 'stale',
			title: 'Stale',
			checkout_history: [fiveMonthsAgo],
			created_at: new Date(now - 400 * msPerDay).toISOString()
		});
		const cats = categorizeRecipes([r], { mealTag: null, useMealContext: false });
		const ids = (title: string) => cats.find((c) => c.title === title)?.recipes.map((x) => x.id) ?? [];
		expect(ids("Haven't Made in 2–6 Months")).toContain('stale');
		expect(ids("Haven't Made in Over 6 Months")).not.toContain('stale');
	});

	it('places last-cook 8 months ago only in the 6+ month bucket', () => {
		const now = Date.now();
		const eightMonthsAgo = new Date(now - 240 * msPerDay).toISOString();
		const r = recipe({
			id: 'very',
			title: 'Very stale',
			checkout_history: [eightMonthsAgo],
			created_at: new Date(now - 400 * msPerDay).toISOString()
		});
		const cats = categorizeRecipes([r], { mealTag: null, useMealContext: false });
		const ids = (title: string) => cats.find((c) => c.title === title)?.recipes.map((x) => x.id) ?? [];
		expect(ids("Haven't Made in Over 6 Months")).toContain('very');
		expect(ids("Haven't Made in 2–6 Months")).not.toContain('very');
	});

	it('ignores an old checkout when a newer checkout exists (last checkout wins)', () => {
		const now = Date.now();
		const recent = new Date(now - 5 * msPerDay).toISOString();
		const ancient = new Date(now - 400 * msPerDay).toISOString();
		const r = recipe({
			id: 'mixed',
			title: 'Mixed history',
			checkout_history: [ancient, recent]
		});
		const cats = categorizeRecipes([r], { mealTag: null, useMealContext: false });
		const inStaleBucket = cats.some(
			(c) =>
				(c.id === 'not-made-2-months' || c.id === 'not-made-6-months') &&
				c.recipes.some((x) => x.id === 'mixed')
		);
		expect(inStaleBucket).toBe(false);
	});
});

describe('shuffleAndTake', () => {
	it('returns at most count items without mutating the source', () => {
		const src = [1, 2, 3, 4, 5];
		const out = shuffleAndTake(src, 3);
		expect(out.length).toBe(3);
		expect(src).toEqual([1, 2, 3, 4, 5]);
	});
});
