<script lang="ts">
	import { getContext } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { v4 as uuid } from 'uuid';

	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { db } from '$lib/db';
	import { getSavedRecipe } from '$lib/stores/recipes';
	import type { SavedRecipe, ViewState } from '$lib/types';
	import Button from '$lib/ui/Button/Button.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import { AppBar } from '$lib/ui/AppBar';
	import BackIcon from '$lib/ui/Icons/BackIcon.svelte';
	import TrashIcon from '$lib/ui/Icons/TrashIcon.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';

	const vp: any = getContext('viewport');

	const id = $derived(page.params.id);

	let promptInput = $state<string>();

	let app = $state({
		view: 'loading' as ViewState,
		error: ''
	});

	let recipe = $state<SavedRecipe>();

	// Responsible for passing the recipe to the FormData
	let recipeJson = $derived(recipe ? JSON.stringify(recipe) : '');

	// Waiting for a response to an OpenAI request
	let waiting = $state(false);

	let left = $derived.by(() => {
		if (vp.device === 'mobile') return '0';
		return vp.nav === 'expanded' ? 'calc(18rem + 1px)' : 'calc(3.5rem + 1px)';
	});

	$effect(() => {
		getSavedRecipe(id)
			.then((response) => {
				if (!response) {
					app.view = 'error';
					app.error = 'A recipe matching the provided ID could not be found.';
					return;
				}
				recipe = response;
				app.view = 'idle';
				db.recipes.update(id, { last_opened: Date.now() });
			})
			.catch((err) => {
				app.error = err.message;
				app.view = 'error';
			});
	});

	async function saveModifiedRecipe(original: SavedRecipe, updated: SavedRecipe) {
		await db.recipes.update(original.id, { is_current: false });

		const version = original.version + 1;
		const now = Date.now();
		const newRecipe: SavedRecipe = {
			...updated,
			id: uuid(),
			version,
			parent_id: original.parent_id ?? original.id,
			is_current: true,
			created_at: now,
			last_opened: now
		};

		await db.recipes.put(newRecipe);
		return newRecipe;
	}
</script>

<PageHeader>
	<AppBar.Root>
		<Button title="Back" href="/recipes" size="xs" icon>
			<BackIcon />
		</Button>
		<AppBar.Text primary={recipe?.title || ''} />
		<AppBar.End>
			<Button title="Trash bin" href="/recipes/trash" size="xs" icon>
				<TrashIcon />
			</Button>
		</AppBar.End>
	</AppBar.Root>
</PageHeader>
<article class="mx-auto max-w-5xl px-4 py-24">
	{#if app.view === 'loading'}
		<div class="absolute inset-0 grid place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{:else if app.view === 'idle' && recipe}
		<h1 class="text-xl font-bold">{recipe.title}</h1>
		<p class="my-4 italic">{recipe.description}</p>
		<p><span class="font-bold">Time:</span> {recipe.estimated_time}</p>
		<ul class="my-4 ml-6 list-disc">
			{#each recipe.ingredients as item}
				<li>{item}</li>
			{/each}
		</ul>
		<ol class="my-4 ml-6 list-decimal">
			{#each recipe.instructions as step}
				<li>{step}</li>
			{/each}
		</ol>
		<div class="fixed right-0 bottom-0" style:left>
			<div class="prompt-bar mx-auto my-4 max-w-xl p-2 rounded-lg bg-gray-50 dark:bg-gray-900 shadow-md">
				<form
					class="flex flex-row gap-2 w-full"
					method="POST"
					use:enhance={() => {
						waiting = true;
						return async ({ result, update }) => {
							// result: { status: number; type: string; data: SavedRecipe }
							if (result.type === 'success' && result.data) {
								// clone the snapshot to avoid "DataCloneError" in `saveModifiedRecipe()`
								const original = structuredClone($state.snapshot(recipe)) as SavedRecipe;

								recipe = result.data as SavedRecipe;
								toast.success(`"${recipe.title}" has unsaved changes`, {
									duration: Number.POSITIVE_INFINITY,
									action: {
										label: 'Save changes',
										onClick: () =>
											saveModifiedRecipe(original, structuredClone($state.snapshot(recipe!)))
									}
								});
							} else {
								console.error(result);
								toast.error(`The request failed`);
							}
							await update();
							waiting = false;
						};
					}}
				>
					<input
						class="grow rounded border border-gray-400 bg-white dark:bg-gray-800 dark:borer-gray-900 p-1"
						type="text"
						name="input"
						bind:value={promptInput}
						placeholder="Would you like to make any changes?"
					/>
					<input type="hidden" name="recipe" bind:value={recipeJson} />
					<Button type="submit" label="Submit request" disabled={waiting}>Submit</Button>
				</form>
			</div>
		</div>
	{:else}
		<h1>Ah, donkeyspittle!</h1>
		<p>A recipe matching the provided ID could not be found.</p>
	{/if}
</article>
