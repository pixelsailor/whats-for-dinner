import { AccountService } from '$lib/api/account/account.service';
import type { UserPreferencesResponse } from '$lib/api/account/account.types';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/auth');
	}

	const accountService = new AccountService(locals.supabase, user.id);

	try {
		const preferences = await accountService.getUserPreferences();
		return { preferences };
	} catch (error) {
		console.error('Failed to load user preferences', error);
		return fail(500, { error: 'Unable to load preferences' });
	}
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { user } = await locals.safeGetSession();
		if (!user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const accountService = new AccountService(locals.supabase, user.id);

		const formData = await request.formData();

		/** Strip whitespace and filter out empty values. */
		const toFilteredArray = (values: FormDataEntryValue[]): string[] | null => {
			const filtered = values
				.map((value) => value.toString().trim())
				.filter((value) => value.length > 0);
			return filtered.length > 0 ? filtered : null;
		};

		const preferences: UserPreferencesResponse = {
			user_id: user.id,
			diet: toFilteredArray(formData.getAll('diet')) || null,
			allergies: toFilteredArray(formData.getAll('allergies')) || null,
			dislikes: toFilteredArray(formData.getAll('dislikes')) || null,
			equipment: toFilteredArray(formData.getAll('equipment')) || null,
			cuisine_preferences: toFilteredArray(formData.getAll('cuisinePreferences')) || null,
			preferred_prep_time: (formData.get('preferredPrepTime') as string)?.trim() || null,
			skill_level: (formData.get('skillLevel') as string)?.trim() || null
		};
		try {
			await accountService.updateUserPreferences(preferences);
		} catch (error) {
			console.error('Failed to update preferences', error);
			return fail(500, { error: 'Failed to save preferences' });
		}
	}
};

