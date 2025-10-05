<script lang="ts">
	import { Time } from '@internationalized/date';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { db } from '$lib/db';
	import type { FullRecipe } from '$lib/types.js';
	import Button from '$lib/ui/Button/Button.svelte';
	import RecipeTime from '$lib/ui/RecipeTime.svelte';
	import { Slider, type TimeValue } from 'bits-ui';
	import { getContext } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { v4 as uuid } from 'uuid';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import { AppBar } from '$lib/ui/AppBar';

	const vp: any = getContext('viewport');

	const hasAssistedRecipeAccess = true;

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
	let prepTime = $state<TimeValue>(new Time(0,0));
	let cookTime = $state<TimeValue>(new Time(0,0));

	let status = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');

	// True when a request is being processed
	let working = $state(false);

	// Parse the `Slider` component as a string
	function insertServingValue(): string {
		form.yield = 'Serves ' + ((servingRange[1] - servingRange[0] === 0) ? `${servingRange[0]}` : servingRange.join(' to '));
		return form.yield;
	}

	function humanizeTimes() {
		let cookStr = '';
		if (cookTime.hour > 0) {
			cookStr += `${cookTime.hour} ${cookTime.hour > 1 ? 'hours ' : 'hour '}`
		}
		if (cookTime.minute > 0) {
			cookStr += `${cookTime.minute} ${cookTime.minute > 1 ? 'minutes' : 'minute'}`
		}
		form.time.cook = cookStr;
		
		let prepStr = '';
		if (prepTime.hour > 0) {
			prepStr += `${prepTime.hour} ${prepTime.hour > 1 ? 'hours ' : 'hour '}`
		}
		if (prepTime.minute > 0) {
			prepStr += `${prepTime.minute} ${prepTime.minute > 1 ? 'minutes' : 'minute'}`
		}
		form.time.prep = prepStr;
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
			is_current: true,
			is_favorite: false,
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

	// Auto-resize textarea to fit content up to max-height
	function autoResize(event: Event) {
	  const textarea = event.target as HTMLTextAreaElement;
	  textarea.style.height = 'auto';
	  textarea.style.height = Math.min(textarea.scrollHeight, 420) + 'px';
	}
</script>

<PageHeader>
	<AppBar.Root />
</PageHeader>

<article class="mx-auto max-w-5xl px-4 pt-24">
	<h1 class="fluid-heading-05 mb-16">Create a new recipe</h1>
	<form method="POST" use:enhance={({ formData, cancel }) => {
		status = 'saving';
		formData.append('yield', insertServingValue());
		humanizeTimes();
		if (!hasAssistedRecipeAccess || !hasEmptyFields()) {
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
		<div class="form-field mb-4 flex min-h-24 flex-col">
			<label for="title" class="label mb-2">Recipe title <span class="required">*</span></label>
			<input type="text" id="title" name="title" class="fluid-heading-04 bg-gray-100 dark:bg-gray-900" required bind:value={form.title} />
		</div>
		<div class="form-field mb-4 flex min-h-24 flex-col">
			<label for="shortDescription" class="label mb-2">Short description</label>
			<textarea
				name="short_description"
				id="shortDescription"
				rows="1"
				bind:value={form.short_description}
				oninput={autoResize}
				class="overflow-hidden max-h-48 resize-none bg-gray-100 dark:bg-gray-900"
			></textarea>
			<p class="helper-text pt-1">A short description of the recipe to include in My Recipes</p>
		</div>
		<div class="form-field mb-4 flex min-h-24 flex-col">
			<label for="servingRange" class="label mb-2">Serves</label>
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
						<Slider.Range class="absolute h-full bg-gray-200 dark:bg-gray-800" />
					</span>
					{#each thumbItems as { index } (index)}
						<Slider.Thumb
							{index}
							class="focus-visible:ring-foreground dark:bg-foreground dark:shadow-card data-active:border-dark-40 z-5 block size-[16px] cursor-pointer rounded-full border bg-gray-300 shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-active:scale-[0.98]"
						/>
					{/each}
					{#each tickItems as { index, value } (index)}
						<Slider.Tick {index} />
						<Slider.TickLabel {index} class="label mt-2" position="bottom">{value}</Slider.TickLabel>
					{/each}
				{/snippet}
			</Slider.Root>
		</div>
		<div class="flex flex-row gap-16">
			<RecipeTime placeholder={new Time(0,0)} labelText="Prep time" bind:value={prepTime} />
			<RecipeTime placeholder={new Time(0,0)} labelText="Cook time" bind:value={cookTime} />
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
			<input type="text" class="w-full bg-gray-100 dark:bg-gray-900" id="tags" name="tags" bind:value={form.tags} />
		</div>
		<div class="my-4 border-t border-gray-200 dark:border-gray-800 pt-4">
			<Button type="submit" size="sm" primary>Save</Button>
		</div>
	</form>
</article>

<style>
	.form-field {
		input,
		textarea {
			padding: 0.5rem 0.75rem;
			border-radius: 0.25rem;
		}
	}
</style>
