import { AccountService } from '$lib/api/account/account.service';
import type { UserPreferences } from '$lib/api/account/account.types';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const toCamelPreferences = (prefs: UserPreferences | null) => {
	const preferences = prefs ?? {};
	return {
		diet: preferences.diet ?? [],
		allergies: preferences.allergies ?? [],
		dislikes: preferences.dislikes ?? [],
		equipment: preferences.equipment ?? [],
		cuisinePreferences: preferences.cuisine_preferences ?? [],
		preferredPrepTime: preferences.preferred_prep_time ?? '',
		skillLevel: preferences.skill_level ?? ''
	};
};

const parseJsonArray = (value: FormDataEntryValue | null): string[] => {
	if (typeof value !== 'string' || !value) return [];
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
	} catch {
		return [];
	}
};

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/auth');
	}

	const accountService = new AccountService(locals.supabase, user.id);

	try {
		const prefs = await accountService.getUserPreferences();
		return {
			preferences: toCamelPreferences(prefs)
		};
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

		const updates: UserPreferences = {
			diet: parseJsonArray(formData.get('diet')),
			allergies: parseJsonArray(formData.get('allergies')),
			dislikes: parseJsonArray(formData.get('dislikes')),
			equipment: parseJsonArray(formData.get('equipment')),
			cuisine_preferences: parseJsonArray(formData.get('cuisinePreferences')),
			preferred_prep_time: (formData.get('preferredPrepTime') as string) || undefined,
			skill_level: (formData.get('skillLevel') as string) || undefined
		};

		try {
			const current = await accountService.getUserPreferences();
			const merged = { ...(current ?? {}), ...updates };
			await accountService.updateUserPreferences(merged);

			return {
				success: true,
				preferences: toCamelPreferences(merged)
			};
		} catch (error) {
			console.error('Failed to update preferences', error);
			return fail(500, { error: 'Failed to save preferences' });
		}
	}
};

