<script lang="ts">
	import { goto } from '$app/navigation';
	import { db } from '$lib/db.js';
	import type { FullRecipe, SavedRecipe, ViewState } from '$lib/types.js';
	import { AppBar } from '$lib/ui/AppBar';
	import Button from '$lib/ui/Button/Button.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import { Slider } from 'bits-ui';
	import { getContext, onMount } from 'svelte';
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

	/**
	 * Save to the User's recipe book
	 */
	async function saveRecipe(event: Event) {
		event.preventDefault();
		working = true;

		const serves = servingRange.join(' to ');

		// const form = event.target as HTMLFormElement;
		// const formData = new FormData(form);
		const now = Date.now();
		const newRecipe: FullRecipe = JSON.parse(JSON.stringify(form));
		
		db.recipes.add({
			...newRecipe,
			yield: serves,
			id: uuid(),
			created_at: now,
			last_opened: now,
			version: 1,
			is_current: true
		}).then((id) => {
			console.log('then', id);
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
	<form onsubmit={saveRecipe}>
		<div class="form-field mb-3 flex min-h-24 flex-col">
			<label for="title" class="label mb-1">Recipe title</label>
			<input type="text" id="title" name="title" class="fluid-heading-04" required bind:value={form.title} />
		</div>
		<div class="form-field mb-3 flex min-h-24 flex-col">
			<label for="description" class="label mb-1">Description</label>
			<textarea name="description" id="description" bind:value={form.description}></textarea>
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
			<label for="time" class="label mb-1">Estimated time</label>
			<input type="text" class="heading w-full" id="time" name="time" bind:value={form.time.total} />
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
