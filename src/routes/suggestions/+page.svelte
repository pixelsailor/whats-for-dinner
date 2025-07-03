<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { recipesApiPostHandler } from '$lib/api';
	import { db } from '$lib/db.js';
	import { createSuggestionsQuery } from '$lib/queries/recipes.js';
	import { saveSuggestions } from '$lib/stores/suggestions.js';
	import type { FullRecipe, RecipeSummary, ViewState } from '$lib/types';
	import { AppBar } from '$lib/ui/AppBar';
	import Button from '$lib/ui/Button/Button.svelte';
	import BackIcon from '$lib/ui/Icons/BackIcon.svelte';
	import { List, ListItem } from '$lib/ui/List';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import { onMount } from 'svelte';

	// let { data } = $props();

	let view = $state<ViewState>();

	let prompt = page.url.searchParams.get('prompt');
	
	// let query = $derived(createSuggestionsQuery(prompt!));
	let query = createSuggestionsQuery(prompt!);

	let suggestionHistory = $state();

	let working = $state(false);

  function goBack() {
    window.history.back();
  }

	onMount(async () => {
		// $inspect('onMount', suggestions)
		if (!prompt) {
			// Show suggestion history
			view = 'loading';
			try {
				suggestionHistory = await db.suggestions.orderBy('created_at').reverse().toArray();
			} catch (err) {
				view = 'error';
			} finally{
				view = 'idle';
			}
		} else {
			// query = createSuggestionsQuery(prompt);
			// Save suggestions to history
			// saveSuggestions(JSON.parse(JSON.stringify(suggestions)));
		}
	});

	// $effect(() => {
	// 	// Save suggestions to history
	// 	const summaries = $query.data.data;
	// 	// saveSuggestions(summaries);
	// })

  function getFullRecipe(recipe: RecipeSummary) {
		working = true;
		const title = encodeURIComponent(recipe.title);
		// include the `short_description` otherwise AI will write a new one
		const desc = encodeURIComponent(recipe.short_description);
		goto(`/suggestions/recipe?title=${title}&desc=${desc}`);
	}

	// $inspect($suggestions.data)
</script>

<PageHeader>
	<AppBar.Root>
		<Button title="Back" onClick={goBack} label="Go back" size="xs" icon>
			<BackIcon />
		</Button>
		{#if prompt}
			<AppBar.Text primary="Suggested Recipes" />
		{:else}
			<AppBar.Text primary="Suggestion History" />
		{/if}
	</AppBar.Root>
</PageHeader>

<main class="mx-auto max-w-5xl px-4 min-h-screen">
	{#if prompt}
		{#if $query.isLoading}
			<div class="mx-auto w-full max-w-3xl h-screen grid place-content-center">
				<ProgressSpinner size="lg" />
			</div>
		{:else if $query.error}
			<div class="mx-auto w-full max-w-3xl h-screen grid place-content-center gap-6">
				<h1 class="fluid-heading-05">Ah donkey-spittle! There was a problem.</h1>
				<p class="flex items-center gap-3"><span class="fluid-heading-03">{$query.error.name}</span><span>|</span><span>{$query.error?.message}</span></p>
			</div>
		{:else if $query.data}
			<div class="py-24">
				<h1 class="mb-8 fluid-heading-05">Here are some ideas for, <span class="italic">"{prompt}"</span></h1>
				<List>
					{#each $query.data.data as summary}
						<ListItem.Root>
							<ListItem.Button onClick={() => getFullRecipe(summary)} disabled={working}>
								<ListItem.Text primary={summary.title} secondary={summary.short_description} />
							</ListItem.Button>
						</ListItem.Root>
					{/each}
				</List>
			</div>
		<!-- {:else if suggestions.length === 0}
			<p>Your suggestion history will appear year after you start requesting recipe suggestions.</p> -->
		{/if}
	{:else}
		<h1 class="mb-4 fluid-heading-05">Suggestion History</h1>
	{/if}
</main>
