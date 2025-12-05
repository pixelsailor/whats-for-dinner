<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { AppBar } from '$lib/ui/AppBar';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import PxlSelect from '$lib/ui/PxlSelect.svelte';
	import { toast } from 'svelte-sonner';

	const options = {
		diet: [
			'Dairy-free',
			'Diabetic-friendly',
			'Gluten-free',
			'Keto',
			'Low-carb',
			'Low-fat',
			'Mediterranean',
			'Paleo',
			'Pescatarian',
			'Vegan',
			'Vegetarian'
		],
		allergies: [
			'Dairy',
			'Eggs',
			'Fish',
			'Gluten',
			'Mustard',
			'Peanuts',
			'Sesame',
			'Shellfish',
			'Soy',
			'Sulfites',
			'Tree nuts'
		],
		equipment: [
			'Air fryer',
			'Blender',
			'Cast iron skillet',
			'Food processor',
			'Grill',
			'Instant Pot / Pressure cooker',
			'Microwave',
			'Oven',
			'Slow cooker',
			'Sous vide',
			'Stand mixer',
			'Stovetop',
			'Toaster oven',
			'Waffle maker'
		],
		prepTime: ['under 30 minutes', '30-60 minutes', 'no time limit'],
		skillLevel: ['beginner', 'intermediate', 'advanced']
	};

	let { data } = $props();

	type PreferenceState = {
		diet: string[];
		allergies: string[];
		equipment: string[];
		cuisinePreferences: string[];
		dislikesText: string;
		preferredPrepTime: string;
		skillLevel: string;
	};

	const toDislikesText = (items: string[] | undefined) => (items ?? []).join(', ');
	const toArrayFromText = (text: string) =>
		text
			.split(',')
			.map((item) => item.trim())
			.filter(Boolean);

	const initial = data.preferences ?? {
		diet: [],
		allergies: [],
		equipment: [],
		dislikes: [],
		preferredPrepTime: '',
		skillLevel: '',
		cuisinePreferences: []
	};

	let form = $state<PreferenceState>({
		diet: initial.diet ?? [],
		allergies: initial.allergies ?? [],
		equipment: initial.equipment ?? [],
		cuisinePreferences: initial.cuisinePreferences ?? [],
		dislikesText: toDislikesText(initial.dislikes),
		preferredPrepTime: initial.preferredPrepTime ?? '',
		skillLevel: initial.skillLevel ?? ''
	});

	let saving = $state(false);
	let saveError = $state('');

	const submitPreferences: SubmitFunction = (input) => {
		const { formData } = input;
		saving = true;
		saveError = '';

		formData.set('diet', JSON.stringify(form.diet ?? []));
		formData.set('allergies', JSON.stringify(form.allergies ?? []));
		formData.set('equipment', JSON.stringify(form.equipment ?? []));
		formData.set('cuisinePreferences', JSON.stringify(form.cuisinePreferences ?? []));
		formData.set('dislikes', JSON.stringify(toArrayFromText(form.dislikesText)));
		formData.set('preferredPrepTime', form.preferredPrepTime);
		formData.set('skillLevel', form.skillLevel);

		return async (response) => {
			const { result } = response;
			saving = false;
			if (result.type === 'success') {
				toast.success('Preferences saved');
			} else if (result.type === 'failure') {
				saveError = (result.data as { error?: string })?.error ?? 'Failed to save preferences';
				toast.error(saveError);
			}
		};
	};

	const clearPreferenceField = (e: Event, prop: keyof PreferenceState) => {
		e.preventDefault();
		e.stopImmediatePropagation();
		if (prop === 'dislikesText') {
			form.dislikesText = '';
			return;
		}
		if (prop === 'preferredPrepTime' || prop === 'skillLevel') {
			form[prop] = '';
		} else {
			form[prop] = [];
		}
	};
</script>

<PageHeader>
	<AppBar.Root />
</PageHeader>

<div class="mx-auto max-w-5xl px-4 lg:px-8">
	<form method="POST" use:enhance={submitPreferences} class="py-24">
		<h1 class="fluid-heading-04 mb-4">Preferences</h1>
		<p class="my-4">
			Set your recipe preferences here. These choices will affect every suggested recipe. If you
			want to modify recipes only occasionally, rather than setting a preference, just be specific
			when asking for ideas. You can modify recipes however you like when asking.
		</p>

		<div class="mb-3 min-h-24">
			<p class="label mb-1">Dietary considerations</p>
			<PxlSelect
				type="multiple"
				sItems={options.diet}
				bind:value={form.diet}
				onReset={(e) => clearPreferenceField(e, 'diet')}
			/>
		</div>

		<div class="mb-3 min-h-24">
			<p class="label mb-1">Allergies</p>
			<PxlSelect
				type="multiple"
				sItems={options.allergies}
				bind:value={form.allergies}
				onReset={(e) => clearPreferenceField(e, 'allergies')}
			/>
		</div>

		<div class="mb-3 min-h-24">
			<p class="label mb-1">Kitchen equipment to avoid</p>
			<PxlSelect
				type="multiple"
				sItems={options.equipment}
				bind:value={form.equipment}
				onReset={(e) => clearPreferenceField(e, 'equipment')}
			/>
			<p class="helper-text opacity-70">
				If you don't have something, include it here. The AI will make an attempt to avoid recipes
				that use these items.
			</p>
		</div>

		<div class="mb-3 min-h-24">
			<p class="label mb-1">Ingredients to avoid</p>
			<input
				type="text"
				class="label my-1 flex h-12 w-full flex-row flex-nowrap items-stretch rounded-sm border border-gray-200 px-3 dark:border-gray-700 dark:bg-gray-900 hover:dark:bg-gray-800"
				bind:value={form.dislikesText}
				placeholder="e.g. olives, capers"
			/>
			<p class="helper-text opacity-70">List anything you don't like that you want excluded.</p>
		</div>

		<div class="mb-3 min-h-24">
			<p class="label mb-1">Preferred prep time</p>
			<PxlSelect
				type="single"
				sItems={options.prepTime}
				bind:value={form.preferredPrepTime}
				onReset={(e) => clearPreferenceField(e, 'preferredPrepTime')}
			/>
		</div>

		<div class="mb-3 min-h-24">
			<p class="label mb-1">Skill level</p>
			<PxlSelect
				type="single"
				sItems={options.skillLevel}
				bind:value={form.skillLevel}
				onReset={(e) => clearPreferenceField(e, 'skillLevel')}
			/>
		</div>

		{#if saveError}
			<p class="text-sm text-red-600 dark:text-red-400">{saveError}</p>
		{/if}

		<button
			type="submit"
			class="btn btn-primary inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
			disabled={saving}
		>
			{#if saving}
				<ProgressSpinner size="sm" />
				Saving…
			{:else}
				Save preferences
			{/if}
		</button>
	</form>
</div>
