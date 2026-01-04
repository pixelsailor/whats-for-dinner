<script lang="ts">
	import { toast } from 'svelte-sonner';
	
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	
	import type { Recipe, SavedRecipe } from '$lib/api/recipe';
	import { db } from '$lib/db.js';
	import Button from '$lib/ui/Button/Button.svelte';
	// import RecipeTime from '$lib/ui/RecipeTime.svelte';
	// import PageHeader from '$lib/ui/PageHeader.svelte';
	// import { AppBar } from '$lib/ui/AppBar';

	let { data } = $props();

	let status = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');

	/**
	 * Get current user permissions (cloud and AI access) from local storage if available.
	 * Fallback: if using Supabase, these would be attached to user records in 'profiles'.
	 * This mechanism assumes local-first/offline by default.
	 */
	let hasAssistedRecipeAccess = $derived(data.permissions?.aiAssistedRecipe.allowed ?? false);

	let form = $state<Recipe>({
		title: '',
		description: '',
		short_description: '',
		yield: '',
		prep_time: [''],
		cook_time: [''],
		ingredients: '',
		instructions: '',
		tags: [],
		notes: '',
	});

	let servingRange = $state([1, 10]);
	let prepTimeHours = $state<number>(0);
	let prepTimeMinutes = $state<number>(0);
	let cookTimeHours = $state<number>(0);
	let cookTimeMinutes = $state<number>(0);

	let tags = $state<string>('');

	// Parse the `Slider` component as a string
	// function insertServingValue(): string {
	// 	form.yield = 'Serves ' + ((servingRange[1] - servingRange[0] === 0) ? `${servingRange[0]}` : servingRange.join(' to '));
	// 	return form.yield;
	// }

	// Auto-resize textarea to fit content up to max-height
	function autoResize(event: Event) {
	  const textarea = event.target as HTMLTextAreaElement;
	  textarea.style.height = 'auto';
	  textarea.style.height = Math.min(textarea.scrollHeight, 420) + 'px';
	}

	function validateForm(): string | null {
		if (!form.title.trim()) return 'Title is required';
		if (!form.ingredients.trim()) return 'Ingredients are required';
		if (!form.instructions.trim()) return 'Instructions are required';
		return null;
	}

	function selectAll(event: Event) {
		const input = event.target as HTMLInputElement;
		input.select();
	}
</script>

<div class="mx-auto max-w-5xl px-4 lg:px-8 py-8">
	<h1 class="display-small mb-16">Create a new recipe</h1>
	<form method="POST" use:enhance={({ cancel }) => {
		status = 'saving';
		// const validationError = validateForm();
		// if (validationError) {
		// 	status = 'error';
		// 	toast.error(validationError);
		// 	cancel();
		// 	return;
		// }
		return async ({ result }) => {
			if (result.type === 'success' && result.data) {
				await db.recipes.add(result.data as SavedRecipe);
				status = 'saved';
				toast.success('Recipe saved');
				goto(`/recipes/${result.data?.id ?? ''}`, { replaceState: true });
			} else {
				status = 'error';
				toast.error('Recipe save failed');
			}
		}
	}}>
		<div class="form-field mb-4 flex min-h-24 flex-col">
			<label for="title" class="label mb-2">Recipe title <span class="required">*</span></label>
			<input type="text" id="title" name="title" class="fluid-heading-04 bg-gray-100 dark:bg-gray-900" required bind:value={form.title} />
		</div>
		<div class="form-field mb-4 flex min-h-24 flex-col">
			<label for="shortDescription" class="label mb-2">Short description</label>
			<textarea
				name="short_description"
				id="shortDescription"
				placeholder="Shown in recipe list and search results."
				rows="1"
				bind:value={form.short_description}
				oninput={autoResize}
				class="overflow-hidden max-h-48 resize-none bg-gray-100 dark:bg-gray-900"
			></textarea>
			{#if hasAssistedRecipeAccess}
				<p class="helper-text pt-1">Leave blank to generate with AI</p>
			{/if}
		</div>
		<div class="form-field mb-4 flex min-h-24 flex-col">
			<label for="description" class="label mb-2">Long-form description</label>
			<textarea
				name="description"
				id="description"
				placeholder="A longer description with additional commentary or suggested pairings. Included in recipe details."
				rows="2"
				bind:value={form.description}
				oninput={autoResize}
				class="overflow-hidden max-h-48 resize-none bg-gray-100 dark:bg-gray-900"
			></textarea>
			{#if hasAssistedRecipeAccess}
				<p class="helper-text pt-1">Leave blank to generate with AI</p>
			{/if}
		</div>
		<div class="form-field mb-4 flex min-h-24 flex-col">
			<label for="servingRange" class="label mb-2">Yields</label>
			<input type="text" class="w-full bg-gray-100 dark:bg-gray-900" id="yield" name="yield" bind:value={form.yield} />
		</div>
		<div class="flex flex-row gap-16">
			<div class="form-field mb-4 flex min-h-24 flex-col">
				<label for="prepTime" class="label mb-2">Prep time</label>
				<div class="flex flow-row gap-1 items-center">
					<input type="number" id="prepHours" name="prep_time_hours" bind:value={prepTimeHours} class="w-16" min="0" max="23" onfocus={(event) => selectAll(event)} />
					<span>:</span>
					<input type="number" id="prepMinutes" name="prep_time_minutes" bind:value={prepTimeMinutes} class="w-16" min="0" max="59" onfocus={(event) => selectAll(event)} />
				</div>
			</div>
			<div class="form-field mb-4 flex min-h-24 flex-col">
				<label for="cookTime" class="label mb-2">Cook time</label>
				<div class="flex flow-row gap-1 items-center">
					<input type="number" id="cookHours" name="cook_time_hours" bind:value={cookTimeHours} class="w-16" min="0" max="23" onfocus={(event) => selectAll(event)} />
					<span>:</span>
					<input type="number" id="cookMinutes" name="cook_time_minutes" bind:value={cookTimeMinutes} class="w-16" min="0" max="59" onfocus={(event) => selectAll(event)} />
				</div>
			</div>
		</div>
		<div class="form-field mb-4 flex min-h-24 flex-col">
			<label for="ingredients" class="label mb-2">Ingredients <span class="required">*</span></label>
			<textarea
				name="ingredients"
				id="ingredients"
				required
				bind:value={form.ingredients}
				oninput={autoResize}
				class="overflow-hidden min-h-40 resize-none bg-gray-100 dark:bg-gray-900"
			></textarea>
			<p class="helper-text pt-1">You can use <a href="https://www.markdownguide.org/cheat-sheet/" target="_blank">Markdown</a> here to make lists and add formatting</p>
		</div>
		<div class="form-field mb-4 flex min-h-24 flex-col">
			<label for="instructions" class="label mb-2">Instructions <span class="required">*</span></label>
			<textarea
				name="instructions"
				id="instructions"
				required
				bind:value={form.instructions}
				oninput={autoResize}
				class="overflow-hidden min-h-40 resize-none bg-gray-100 dark:bg-gray-900"
			></textarea>
			<p class="helper-text pt-1">You can use <a href="https://www.markdownguide.org/cheat-sheet/" target="_blank">Markdown</a> here to make lists and add formatting</p>
		</div>
		<div class="form-field mb-4 flex min-h-24 flex-col">
			<label for="notes" class="label mb-2">Notes</label>
			<textarea
				name="notes"
				id="notes"
				bind:value={form.notes}
				oninput={autoResize}
				class="overflow-hidden max-h-48 min-h-16 resize-none bg-gray-100 dark:bg-gray-900"
			></textarea>
		</div>
		<div class="form-field mb-4 flex min-h-24 flex-col">
			<label for="tags" class="label mb-2">Tags</label>
			<input type="text" class="w-full bg-gray-100 dark:bg-gray-900" id="tags" name="tags" bind:value={tags} />
		</div>
		<div class="my-4 border-t border-gray-200 dark:border-gray-800 pt-4">
			<Button type="submit" size="sm" primary>Save</Button>
		</div>
	</form>
</div>

<style>
	.form-field {
		input,
		textarea {
			padding: 0.5rem 0.75rem;
			border-radius: 0.25rem;
		}
	}
</style>
