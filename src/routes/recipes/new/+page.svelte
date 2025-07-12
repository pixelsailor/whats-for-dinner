<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { db } from '$lib/db.js';
	import type { FullRecipe } from '$lib/types.js';
	import { AppBar } from '$lib/ui/AppBar';
	import Button from '$lib/ui/Button/Button.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import { Slider } from 'bits-ui';
	import { getContext } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { v4 as uuid } from 'uuid';

	const vp: any = getContext('viewport');

	let form = $state<FullRecipe>({
		title: '',
		description: '',
		short_description: '',
		yield: '',
		time: {
			prep: '',
			cook: '',
			total: ''
		},
		ingredients: '',
		instructions: '',
		tags: []
	});

	let servingRange = $state([1, 10]);

	let status = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');

	// True when a request is being processed
	let working = $state(false);

	// Parse the `Slider` component as a string
	function insertServingValue(): string {
		form.yield = 'Serves ' + (servingRange[1] - servingRange[0] === 0) ? `${servingRange[0]}` : servingRange.join(' to ');
		return form.yield;
	}

	// Checks for empty form values. If false, can cancel server query and handle in browser
	function hasEmptyFields(): boolean {
		const missingFields = [
			'short_description',
			'yield',
			'time.prep',
			'time.cook',
			'time.total',
			'tags'
		].filter((field) => {
			const value = field.includes('time.')
				? form.time[field.split('.')[1] as 'prep' | 'cook' | 'total']
				: form[field as keyof FullRecipe];
			return !value || (Array.isArray(value) && value.length === 0);
    });

		return missingFields.length > 0;
	}

	function updateRecipe(response: string) {
		const aiFields = JSON.parse(response);
		const formFields = JSON.parse(JSON.stringify(form));
		const recipe = {
			...formFields,
			...aiFields
		};
		saveRecipe(recipe);
	}

	/**
	 * Save to the User's recipe book
	 */
	async function saveRecipe(recipe?: FullRecipe) {
		working = true;
		status = 'saving';

		const now = Date.now();
		const newRecipe: FullRecipe = JSON.parse(JSON.stringify(recipe || form));

		db.recipes.add({
			...newRecipe,
			id: uuid(),
			created_at: now,
			last_opened: now,
			version: 1,
			is_current: true
		}).then((id) => {
			status = 'saved';
			goto(`/recipes/${id}`, { replaceState: true });
		},
		(err) => {
			console.error('err', err);
			toast.error('Save failed');
			status = 'error';
		})
	}
</script>

<PageHeader>
	<AppBar.Root>
		<AppBar.Text primary="Create a Recipe" />
	</AppBar.Root>
</PageHeader>
<article class="mx-auto max-w-5xl px-4 pt-24">
	<h1 class="fluid-heading-05 mb-16">Create a new recipe</h1>
	<form method="POST" use:enhance={({ formData, cancel }) => {
		status = 'saving';
		formData.append('yield', insertServingValue());
		if (!hasEmptyFields()) {
			cancel();
			saveRecipe();
		}
		return async ({ result, update }) => {
			if (result.type === 'success') {
				updateRecipe(result.data?.message as string);
			} else {
				status = 'error';
			}
			await update();
		}
	}}>
		<div class="form-field mb-3 flex min-h-24 flex-col">
			<label for="title" class="label mb-1">Recipe title</label>
			<input type="text" id="title" name="title" class="fluid-heading-04" required bind:value={form.title} />
		</div>
		<div class="form-field mb-3 flex min-h-24 flex-col">
			<label for="shortDescription" class="label mb-1">Short description</label>
			<textarea name="short_description" id="shortDescription" bind:value={form.short_description}></textarea>
			<p class="helper-text">A short description of the recipe to include in My Recipes</p>
		</div>
		<div class="form-field mb-3 flex min-h-24 flex-col">
			<label for="yield" class="label mb-1">Serves</label>
			<!-- <input type="text" id="yield" name="title" required> -->
			<Slider.Root
				type="multiple"
				min={1}
				max={10}
				step={1}
				class="relative flex w-full touch-none items-center select-none"
				bind:value={servingRange}
			>
				{#snippet children({ tickItems, thumbItems })}
					<span class="relative h-2 w-full grow cursor-pointer overflow-hidden rounded-full">
						<Slider.Range class="absolute h-full dark:bg-gray-500" />
					</span>
					{#each thumbItems as { index } (index)}
						<Slider.Thumb
							{index}
							class="focus-visible:ring-foreground dark:bg-foreground dark:shadow-card data-active:border-dark-40 z-5 block size-[16px] cursor-pointer rounded-full border bg-gray-300 shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-active:scale-[0.98]"
						/>
					{/each}
					{#each tickItems as { index } (index)}
						<Slider.Tick {index} />
					{/each}
				{/snippet}
			</Slider.Root>
		</div>
		<div class="form-field mb-3 flex min-h-24 flex-col">
			<label for="prepTime" class="label mb-1">Prep time</label>
			<input type="text" class="heading w-full" id="prepTime" name="prep_time" bind:value={form.time.prep} />
		</div>
		<div class="form-field mb-3 flex min-h-24 flex-col">
			<label for="cookTime" class="label mb-1">Cook time</label>
			<input type="text" class="heading w-full" id="cookTime" name="cook_time" bind:value={form.time.cook} />
		</div>
		<div class="form-field mb-3 flex min-h-24 flex-col">
			<label for="ingredients" class="label mb-1">Ingredients</label>
			<textarea name="ingredients" id="ingredients" required bind:value={form.ingredients}></textarea>
		</div>
		<div class="form-field mb-3 flex min-h-24 flex-col">
			<label for="instructions" class="label mb-1">Instructions</label>
			<textarea name="instructions" id="instructions" required bind:value={form.instructions}></textarea>
		</div>
		<div class="form-field mb-3 flex min-h-24 flex-col">
			<label for="notes" class="label mb-1">Notes</label>
			<textarea name="notes" id="notes" bind:value={form.notes}></textarea>
		</div>
		<div class="form-field mb-3 flex min-h-24 flex-col">
			<label for="tags" class="label mb-1">Tags</label>
			<input type="text" class="w-full" id="tags" name="tags" bind:value={form.tags} />
		</div>
		<div class="my-4 border-t border-gray-300 pt-4">
			<Button type="submit" size="sm" primary>Save</Button>
		</div>
	</form>
</article>

<style>
	.form-field {
		input,
		textarea {
			border: 1px solid gray;
			padding: 0.25rem 0.75rem;
			border-radius: 0.25rem;
		}
	}
</style>
