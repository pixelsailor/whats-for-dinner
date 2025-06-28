<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { v4 as uuid } from 'uuid';

	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { db } from '$lib/db';
	import { getSavedRecipe } from '$lib/stores/recipes';
	import type { SavedRecipe, ViewState } from '$lib/types';
	import Button from '$lib/ui/Button/Button.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';

	const id = $derived(page.params.id);

	let promptInput = $state<string>();

	let app = $state({
		view: 'loading' as ViewState,
		error: '',
	});
	
  let recipe = $state<SavedRecipe>();

  let recipeJson = $derived(recipe ? JSON.stringify(recipe) : '');

  // Waiting for a response to an OpenAI request
  let waiting = $state(false);

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

<header></header>
<article class="px-4 pb-32">
	{#if app.view === 'loading'}
		<div class="absolute inset-0 grid place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{:else if app.view === 'idle' && recipe}
		<h1 class="my-4 text-xl font-bold">{recipe.title}</h1>
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
    <div class="absolute bottom-0 left-0 right-0">
      <div class="prompt-bar mx-auto max-w-md w-fit bg-gray-50 rounded-lg shadow-md my-4">
        <form class="flex flex-row gap-2 p-2" method="POST" use:enhance={() => {
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
                  onClick: () => saveModifiedRecipe(original, structuredClone($state.snapshot(recipe!))),
                }
              });
            } else {
              console.error(result);
              toast.error(`The request failed`);
            }
            await update()
            waiting = false;
          }
        }}>
          <input class="border rounded border-gray-400 bg-white w-full" type="text" name="input" bind:value={promptInput} />
          <input type="hidden" name="recipe" bind:value={recipeJson} disabled={waiting} />
          <Button type="submit" label="Submit request">Submit</Button>
        </form>
      </div>
    </div>
	{:else}
		<h1>Ah, donkeyspittle!</h1>
		<p>A recipe matching the provided ID could not be found.</p>
	{/if}
</article>
