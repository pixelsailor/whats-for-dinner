<script lang="ts">
	import { Button } from 'bits-ui';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	
	// import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	
	import { CATEGORY_TAGS, type Recipe, type SavedRecipe } from '$lib/api/recipe';
	import { db } from '$lib/db.js';
	// import Button from '$lib/ui/Button/Button.svelte';
	import Select from '$lib/ui/Select.svelte';
	import { Textarea, Textinput } from '$lib/ui/forms';
	import type { SelectOption } from '$lib/ui/types.js';
	// import RecipeTime from '$lib/ui/RecipeTime.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import { AppBar } from '$lib/ui/AppBar';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	// import { appendRecipeDetails } from '$lib/api/ai';

	// const commonTags = new SvelteSet<string>();
	let availableTags = $state<SelectOption[]>([]);

	let { data } = $props();

	let status = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');

	let validationErrors = $state<{
		hasErrors?: boolean;
		errors?: {
			title?: string;
			shortDescription?: string;
			ingredients?: string;
			instructions?: string;
			tags?: string;
		};
	}>({});

	/**
	 * Get current user permissions (cloud and AI access) from local storage if available.
	 * Fallback: if using Supabase, these would be attached to user records in 'profiles'.
	 * This mechanism assumes local-first/offline by default.
	 */
	let hasAssistedRecipeAccess = $derived(data.permissions?.aiAssistedRecipe.allowed ?? false);

	let recipeTitle = $state<string>('');
	let shortDescription = $state<string>('');
	let longDescription = $state<string>('');
	let yields = $state<string>('');
	let prepTimeHours = $state<number>(0);
	let prepTimeMinutes = $state<number>(0);
	let cookTimeHours = $state<number>(0);
	let cookTimeMinutes = $state<number>(0);
	let ingredients = $state<string>('');
	let instructions = $state<string>('');
	let notes = $state<string>('');
	let tags = $state<string[]>([]);

	// Parse the `Slider` component as a string
	// function insertServingValue(): string {
	// 	yield = 'Serves ' + ((servingRange[1] - servingRange[0] === 0) ? `${servingRange[0]}` : servingRange.join(' to '));
	// 	return yield;
	// }

	onMount(() => {
		availableTags = Object.entries(CATEGORY_TAGS).map(([key, values]) => ({
			label: key.charAt(0).toUpperCase() + key.slice(1),
			value: key,
			disabled: true,
			items: values.map((tag) => ({
				label: tag,
				value: tag
			}))
		}));
	});

	async function saveRecipe(event: SubmitEvent) {
		event.preventDefault();
		const form = new FormData(event.target as HTMLFormElement, event.submitter as HTMLButtonElement);
		console.log('saveRecipe form', form);
		
		validateForm();
		if (validationErrors.hasErrors) {
			status = 'error';
			toast.error('Please fix the errors in the form');
			return;
		}
		status = 'saving';

		// let candidate: SavedRecipe | undefined = undefined;
		const prepTime = [_convertTimeToMinutes(prepTimeHours.toString(), prepTimeMinutes.toString())];
		const cookTime = [_convertTimeToMinutes(cookTimeHours.toString(), cookTimeMinutes.toString())];

		let recipe: Recipe = {
			title: form.get('title')?.toString() ?? '',
			short_description: form.get('short_description')?.toString() ?? '',
			description: form.get('description')?.toString() ?? '',
			yield: form.get('yields')?.toString() ?? '',
			prep_time: prepTime,
			cook_time: cookTime,
			ingredients: form.get('ingredients')?.toString() ?? '',
			instructions: form.get('instructions')?.toString() ?? '',
			notes: form.get('notes')?.toString() ?? '',
			tags: $state.snapshot(tags),
		};

		// if (hasAssistedRecipeAccess) {
		// 	const response = await appendRecipeDetails(JSON.stringify(recipe));
		// 	recipe = JSON.parse(response as string) as Recipe;
		// }

		// if (hasCloudStorageAccess) {
		// 	const savedRecipe = await _saveToLocal(candidate);
		// 	status = 'saved';
		// 	toast.success('Recipe saved');
		// 	goto(`/recipes/${savedRecipe}`, { replaceState: true });
		// }

		const savedRecipe = await _saveToLocal(recipe);
		status = 'saved';
		toast.success('Recipe saved');
		goto(`/recipes/${savedRecipe}`, { replaceState: true });
	}

	/**
	 * Validate the form fields and set the validation errors.
	 */
	function validateForm() {
		let errors: {
			title?: string;
			shortDescription?: string;
			ingredients?: string;
			instructions?: string;
			tags?: string;
		} = {};
		if (!recipeTitle.trim()) errors.title = 'Title is required';
		if (!ingredients.trim()) errors.ingredients = 'Ingredients are required';
		if (!instructions.trim()) errors.instructions = 'Instructions are required';
		if (!hasAssistedRecipeAccess && !shortDescription.trim()) errors.shortDescription = 'Short description is required';
		if (!hasAssistedRecipeAccess && !tags.length) errors.tags = 'Tags are required';

		if (Object.keys(errors).length > 0) {
			validationErrors.hasErrors = true;
			validationErrors.errors = errors;
		} else {
			validationErrors.hasErrors = false;
			validationErrors.errors = undefined;
		}
	}

	function selectAll(event: Event) {
		const input = event.target as HTMLInputElement;
		input.select();
	}

	function _convertTimeToMinutes(hours: string, minutes: string): string {
		const hoursInt = parseInt(hours.trim());
		const minutesInt = parseInt(minutes.trim());
		const time = hoursInt * 60 + minutesInt;
		return time.toString();
	}

	async function _saveToLocal(recipe: Recipe, error?: string | null): Promise<string> {
		const userId = data.user?.id;
		const now = new Date().toISOString();
		const savedRecipe: SavedRecipe = {
			...recipe,
			synced: false,
			sync_error: error ?? null,
			id: crypto.randomUUID(),
			created_at: now,
			updated_at: now,
			archived: null,
			deleted_at: null,
			last_opened: now,
			version: 1,
			checkout_history: [],
			is_current: true,
			is_favorite: false,
			owner_id: userId ?? null,
			shared_id: null,
			last_synced_at: null,
			parent_id: null,
		};
		try {
			await db.recipes.add(savedRecipe);
			return savedRecipe.id;
		} catch (err) {
			console.error('Failed to save recipe to local database', err);
			throw err;
		}
	}
</script>

<PageHeader>
	<AppBar.Root>
		<AppBar.End>
			{#if status === 'saving'}
				<div class="grid h-10 w-10 place-content-center">
					<ProgressSpinner size="xs" />
				</div>
			{/if}
		</AppBar.End>
	</AppBar.Root>
</PageHeader>
<div class="mx-auto max-w-5xl px-4 lg:px-8 py-8">
	<h1 class="display-small mb-4">Create a new recipe</h1>
	<!-- <form method="POST" use:enhance={({ cancel }) => {
		status = 'saving';
		validateForm();
		if (validationErrors.hasErrors) {
			status = 'error';
			cancel();
			return;
		}
		return async ({ result, }) => {
			if (result.type === 'success' && result.data) {
				// Save to local Dexie database (client-side only)
				const savedRecipe = result.data as SavedRecipe;
				await db.recipes.add(savedRecipe);
				status = 'saved';
				toast.success('Recipe saved');
				goto(`/recipes/${savedRecipe.id ?? ''}`, { replaceState: true });
			} else {
				const savedRecipe = await _saveToLocal(result.data as Recipe, result.error as string | null);
				toast.error('Recipe failed to sync to cloud');
				goto(`/recipes/new`, { replaceState: true });
				status = 'error';
				toast.error('Recipe save failed');
			}
		}
	}}> -->
	<form method="POST" onsubmit={saveRecipe}>
		<div class="flex flex-col gap-5">
			<Textinput
				name="title"
				bind:value={recipeTitle}
				label="Recipe title"
				required
				error={validationErrors.errors?.title}
			/>
			<Textinput
				name="short_description"
				bind:value={shortDescription}
				required={!hasAssistedRecipeAccess}
				error={validationErrors.errors?.shortDescription}
				label="Short description"
				placeholder="Shown in recipe list and search results."
				helperText="Leave blank to generate with AI"
			/>
			<Textarea
				id="description"
				name="description"
				bind:value={longDescription}
				label="Long-form description"
				placeholder="A longer description with additional commentary or suggested pairings. Included in recipe details."
			>
				<p class="label-small">Leave blank to generate with AI</p>
			</Textarea>
			<Textinput
				name="yields"
				bind:value={yields}
				label="Yields"
				placeholder="Enter the number of servings or total amount for sauces, dressings or similar"
			/>
			<div class="flex flex-col gap-1">
				<div class="flex flex-row gap-16">
					<div class="form-field">
						<label for="prepTime" class="label-medium">Prep time</label>
						<div class="textinput flex flow-row gap-1 items-center">
							<input type="number" id="prepHours" name="prep_time_hours" bind:value={prepTimeHours} class="w-16" min="0" max="23" onfocus={(event) => selectAll(event)} />
							<span>:</span>
							<input type="number" id="prepMinutes" name="prep_time_minutes" bind:value={prepTimeMinutes} class="w-16" min="0" max="59" onfocus={(event) => selectAll(event)} />
						</div>
					</div>
					<div class="form-field">
						<label for="cookTime" class="label-medium">Cook time</label>
						<div class="textinput flex flow-row gap-1 items-center">
							<input type="number" id="cookHours" name="cook_time_hours" bind:value={cookTimeHours} class="w-16" min="0" max="23" onfocus={(event) => selectAll(event)} />
							<span>:</span>
							<input type="number" id="cookMinutes" name="cook_time_minutes" bind:value={cookTimeMinutes} class="w-16" min="0" max="59" onfocus={(event) => selectAll(event)} />
						</div>
					</div>
				</div>
				{#if hasAssistedRecipeAccess}
					<p class="label-small">The AI will use its best guess for the times if you leave either of these blank</p>
				{/if}
			</div>
			<Textarea
				id="ingredients"
				name="ingredients"
				label="Ingredients"
				bind:value={ingredients}
				required
				error={validationErrors.errors?.ingredients}
				placeholder="Enter the ingredients for your recipe"
			>
				<p class="label-small">You can use <a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" class="underline">Markdown</a> here to make lists and add formatting</p>
			</Textarea>
			<Textarea
				id="instructions"
				name="instructions"
				label="Instructions"
				bind:value={instructions}
				required
				error={validationErrors.errors?.instructions}
				placeholder="Enter the instructions for your recipe"
			>
				<p class="label-small">You can use <a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" class="underline">Markdown</a> here to make lists and add formatting</p>
			</Textarea>
			<Textarea
				id="notes"
				name="notes"
				bind:value={notes}
				label="Notes"
				placeholder="Enter any additional notes for your recipe"
			>
				<p class="label-small">You can use <a href="https://www.markdownguide.org/cheat-sheet/" target="_blank" class="underline">Markdown</a> here to make lists and add formatting</p>
			</Textarea>
			<div class="form-field">
				<label for="tags" class="label-medium">Tags {#if !hasAssistedRecipeAccess} <span class="label-large text-destructive">*</span>{/if}</label>
				<Select
					name="tags"
					type="multiple"
					bind:value={tags}
					items={availableTags}
					error={validationErrors.errors?.tags}
				/>
				{#if hasAssistedRecipeAccess}
					<p class="label-small">Leave blank to generate with AI</p>
				{/if}
			</div>
			<div class="my-4 border-t border-line pt-4">
				<Button.Root type="submit" class="button primary" disabled={status === 'saving'}>
					Save
				</Button.Root>
			</div>
		</div>
	</form>
</div>
