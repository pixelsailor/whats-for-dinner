<script lang="ts">
	import { page } from '$app/state';
	import { getSavedRecipe } from '$lib/stores/recipes';
	import type { SavedRecipe, ViewState } from '$lib/types';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';

	const id = $derived(page.params.id);

	let app = $state({
		view: 'loading' as ViewState,
		error: ''
	});

	let recipe = $state<SavedRecipe>();

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
			})
			.catch((err) => {
				app.error = err.message;
				app.view = 'error';
			});
	});

	$inspect(recipe);
</script>

<header></header>
<main class="px-4">
	{#if app.view === 'loading'}
		<div class="absolute inset-0 grid place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{:else if app.view === 'error'}
		<h1>Ah, donkeyspittle!</h1>
		<p>{app.error}</p>
	{:else if app.view === 'idle' && recipe}
		<div>
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
		</div>
	{/if}
</main>
