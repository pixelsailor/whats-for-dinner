<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { createSuggestionsQuery } from '$lib/queries/recipes.js';
	import {
		bulkDeleteSuggestions,
		saveSuggestions,
		suggestionHistory
	} from '$lib/stores/suggestions.js';
	import type { RecipeSummary } from '$lib/types';
	import { AppBar } from '$lib/ui/AppBar';
	import Button from '$lib/ui/Button/Button.svelte';
	import BackIcon from '$lib/ui/Icons/BackIcon.svelte';
	import { List, ListItem } from '$lib/ui/List';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';

	let { data } = $props();

	let userPreferences = $state(data.preferences);

	let prompt = $derived(page.url.searchParams.get('prompt'));

	const hasPrompt = $derived(!!prompt);

	let query = $derived(createSuggestionsQuery(prompt, userPreferences));

	let working = $state(false);

	let search = $state<string>();

	// Suggestions filtered by search
	let filteredSuggestions = $derived.by(() => {
		if (!search || search.length <= 2) {
			return $suggestionHistory;
		} else {
			return filterSuggestions(search);
		}
	});

	function goBack() {
		window.history.back();
	}

	// Filter suggestions
	function filterSuggestions(value: string) {
		const lower = value.toLowerCase();
		return $suggestionHistory.filter(
			(s) =>
				s.title.toLowerCase().includes(lower) || s.short_description.toLowerCase().includes(lower)
		);
	}

	// Save suggestions to history
	$effect(() => {
		if (hasPrompt && $query?.data) {
			if ($query.data.data[1]) {
				const summaries = $query.data.data[1] as RecipeSummary[];
				saveSuggestions(summaries);
			}
		}
	});

	function getFullRecipe(recipe: RecipeSummary) {
		working = true;
		const title = encodeURIComponent(recipe.title);
		// include the `short_description` otherwise AI will write a new one
		const desc = encodeURIComponent(recipe.short_description);
		goto(`/suggestions/recipe?title=${title}&desc=${desc}`);
	}
</script>

<PageHeader>
	<AppBar.Root>
		<Button title="Back" onClick={goBack} label="Go back" size="xs" icon>
			<BackIcon />
		</Button>
		{#if hasPrompt}
			<AppBar.Text primary="Suggested Recipes" />
		{:else}
			<AppBar.Text primary="Suggestion History" />
		{/if}
	</AppBar.Root>
</PageHeader>

<main class="mx-auto min-h-screen max-w-5xl px-4">
	{#if hasPrompt && $query}
		{#if $query.isLoading}
			<div class="mx-auto grid h-screen w-full max-w-3xl place-content-center">
				<ProgressSpinner size="lg" />
			</div>
		{:else if $query.error}
			<div class="mx-auto grid h-screen w-full max-w-3xl place-content-center gap-6">
				<h1 class="fluid-heading-05">Ah donkey-spittle! There was a problem.</h1>
				<p class="flex items-center gap-3">
					<span class="fluid-heading-03">{$query.error.name}</span><span>|</span><span
						>{$query.error?.message}</span
					>
				</p>
			</div>
		{:else if $query.data}
			<div class="py-24">
				<h1 class="fluid-heading-05 mb-8">
					Here are some ideas for, <span class="italic">"{prompt}"</span>
				</h1>
				<List>
					{#each $query.data.data[1] as summary}
						<ListItem.Root>
							<ListItem.Button onClick={() => getFullRecipe(summary)} disabled={working}>
								<ListItem.Text primary={summary.title} secondary={summary.short_description} />
							</ListItem.Button>
						</ListItem.Root>
					{/each}
				</List>
			</div>
		{/if}
	{:else}
		<div class="py-24">
			<h1 class="fluid-heading-05 mb-4">Suggestion History</h1>
			{#if $suggestionHistory.length > 0}
				<div class="my-12 w-full">
					<input
						type="text"
						class="label my-1 flex h-12 w-full flex-row flex-nowrap items-stretch rounded-sm border border-gray-200 px-3 dark:border-gray-700 dark:bg-gray-900 hover:dark:bg-gray-800"
						placeholder="Search history"
						bind:value={search}
					/>
				</div>
			{/if}
			{#if filteredSuggestions.length > 0}
				<div class="flex flex-row items-center justify-between">
					<Button size="sm" onClick={() => bulkDeleteSuggestions()} label="Delete suggestions">
						Delete suggestions
					</Button>
				</div>
				<List>
					{#each filteredSuggestions as summary}
						<hr class="border-gray-200 dark:border-gray-700" />
						<ListItem.Root>
							<ListItem.Button onClick={() => getFullRecipe(summary)} disabled={working}>
								<ListItem.Text primary={summary.title} secondary={summary.short_description} />
							</ListItem.Button>
						</ListItem.Root>
					{/each}
				</List>
			{:else}
				<p>
					Your suggestion history will appear year after you start requesting recipe suggestions.
				</p>
			{/if}
		</div>
	{/if}
</main>
