<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { recipesApiPostHandler } from '$lib/api';
	import { db } from '$lib/db.js';
	import { saveSuggestions } from '$lib/stores/suggestions.js';
	import type { FullRecipe, RecipeSummary, Suggestion, ViewState } from '$lib/types';
	import { AppBar } from '$lib/ui/AppBar';
	import Button from '$lib/ui/Button/Button.svelte';
	import BackIcon from '$lib/ui/Icons/BackIcon.svelte';
	import { List, ListItem } from '$lib/ui/List';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import { onMount } from 'svelte';

	let { data } = $props();

	let view = $state<ViewState>();

	let suggestions = $state(data.suggestions);

	let prompt = page.url.searchParams.get('prompt');

	let working = $state(false);

  function goBack() {
    window.history.back();
  }

	onMount(async () => {
		$inspect('onMount', suggestions)
		if (!prompt) {
			// Show suggestion history
			view = 'loading';
			try {
				suggestions = await db.suggestions.orderBy('created_at').reverse().toArray();
			} catch (err) {
				view = 'error';
			} finally{
				view = 'idle';
			}
		} else {
			// Save suggestions to history
			saveSuggestions(JSON.parse(JSON.stringify(suggestions)));
		}
	});

  function getFullRecipe(recipe: RecipeSummary) {
		console.log('getFullRecipe');
		
		working = true;
		const title = encodeURIComponent(recipe.title);
		// include the `short_description` otherwise AI will write a new one
		const desc = encodeURIComponent(recipe.short_description);
		goto(`/recipes/new?title=${title}&desc=${desc}`);
	}
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

<main class="mx-auto max-w-5xl px-4 py-24">
	{#if view === 'error'}
		<h1 class="fluid-heading-05 my-8">Ah donkey-spittle! There was a problem.</h1>
		<p class="flex items-center gap-3">The suggestion history failed to load.</p>
	{:else if prompt}
		<h1 class="mb-4 fluid-heading-05">Here are some ideas for, <span class="italic">"{prompt}"</span></h1>
	{:else}
		<h1 class="mb-4fluid-heading-05">Suggestion History</h1>
	{/if}

	{#if suggestions.length > 0}
		<List>
			{#each suggestions as summary}
				<ListItem.Root>
					<ListItem.Button onClick={() => getFullRecipe(summary)} disabled={working}>
						<ListItem.Text primary={summary.title} secondary={summary.short_description} />
					</ListItem.Button>
				</ListItem.Root>
			{/each}
		</List>
  {:else if suggestions.length === 0}
    <p>Your suggestion history will appear year after you start requesting recipe suggestions.</p>
	{/if}
</main>
