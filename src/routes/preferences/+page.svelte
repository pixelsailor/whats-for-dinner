<script lang="ts">
	import { preferences, updatePreferences } from '$lib/stores/preferences';
	import { AppBar } from '$lib/ui/AppBar';
	import Button from '$lib/ui/Button/Button.svelte';
	import BackIcon from '$lib/ui/Icons/BackIcon.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import PxlSelect from '$lib/ui/PxlSelect.svelte';
	import { Label, RadioGroup, Select } from 'bits-ui';
	import { onMount } from 'svelte';
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

	// User Preferences
	let diet = $derived($preferences.data?.diet);
	let allergies = $derived($preferences.data?.allergies);
	let equipment = $derived($preferences.data?.equipment);
	let dislikes = $derived($preferences.data?.dislikes);
	let prepTime = $derived($preferences.data?.preferredPrepTime);
	let skillLevel = $derived($preferences.data?.skillLevel);

	const handleFieldChange = async (prop: string) => {
		const fieldMap: Record<string, string | string[] | undefined> = {
			diet,
			allergies,
			equipment,
			dislikes,
			prepTime,
			skillLevel
		};
		const fieldValue: string | string[] | undefined = JSON.parse(JSON.stringify(fieldMap[prop]));

		try {
			await updatePreferences({ [prop]: fieldValue });
		} catch (err) {
			toast.error('Failed to save changes');
		}
	};

	const clearPreferenceField = async (e: Event, prop: string) => {
		e.preventDefault();
		e.stopImmediatePropagation();
		try {
			await updatePreferences({ [prop]: [] });
		} catch (err) {
			toast.error('Failed to save changes');
		}
	};
</script>

<PageHeader>
	<AppBar.Root>
		<Button title="Back" onClick={() => history.back()} label="Go back" size="xs" icon>
			<BackIcon />
		</Button>
	</AppBar.Root>
</PageHeader>

<main class="mx-auto min-h-screen max-w-5xl px-4">
	{#if $preferences.loading}
		<div class="mx-auto grid h-screen w-full max-w-3xl place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{:else if $preferences.data}
		<div class="py-24">
			<h1 class="fluid-heading-05 mb-8">Preferences</h1>
			<p class="my-8">
				Set your recipe preferences here. These choices will affect every suggested recipe. If you
				want to modify recipes only occasionally, rather than setting a preference, just be specific
				when asking for ideas. You can modify recipes however you like when asking.
			</p>
			<div class="mb-3 min-h-24">
				<p class="label mb-1">Dietary considerations</p>
				<PxlSelect
					type="multiple"
					sItems={options.diet}
					bind:value={diet}
					onValueChange={() => handleFieldChange('diet')}
					onReset={(e) => clearPreferenceField(e, 'diet')}
				/>
			</div>

			<div class="mb-3 min-h-24">
				<p class="label mb-1">Allergies</p>
				<PxlSelect
					type="multiple"
					sItems={options.allergies}
					bind:value={allergies}
					onValueChange={() => handleFieldChange('allergies')}
					onReset={(e) => clearPreferenceField(e, 'allergies')}
				/>
			</div>

			<div class="mb-3 min-h-24">
				<p class="label mb-1">Kitchen equipment to avoid</p>
				<PxlSelect
					type="multiple"
					sItems={options.equipment}
					bind:value={equipment}
					onValueChange={() => handleFieldChange('equipment')}
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
					bind:value={dislikes}
					onchange={() => handleFieldChange('dislikes')}
				/>
				<p class="helper-text opacity-70">List anything you don't like that you want excluded.</p>
			</div>
		</div>
	{/if}
</main>
