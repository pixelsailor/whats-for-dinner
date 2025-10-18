<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { createSuggestionsQuery } from '$lib/queries/recipes.js';
	// import { recommendedRecipes } from '$lib/stores/recommendations.js';
	import {
		bulkDeleteSuggestions,
		saveSuggestions,
		suggestionHistory,
		getViewedStatus
	} from '$lib/stores/suggestions.js';
	import type { RecipeSummary, Suggestion } from '$lib/types';
	// import { AppBar } from '$lib/ui/AppBar/index.js';
	import Button from '$lib/ui/Button/Button.svelte';
	// import TrashIcon from '$lib/ui/Icons/TrashIcon.svelte';
	import { List, ListItem } from '$lib/ui/List';
	// import PageHeader from '$lib/ui/PageHeader.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import ViewedBadge from '$lib/ui/ViewedBadge.svelte';

	/**
	 * `/routes/suggestions` is for handling LLM responses. While it uses the User's local preference
	 * data for customizing the suggestion prompt, this page requires LLM API access at all times.
	 * `/routes/recommendations` on the other hand is completely in browser and should not have
	 * a server requirement.
	 */

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

	// Group suggestions by day
	let groupedSuggestions = $derived.by(() => {
		const groups: Record<string, Suggestion[]> = {};
		for (const s of filteredSuggestions) {
			const day = new Date(s.created_at).toLocaleDateString();
			if (!groups[day]) groups[day] = [];
			groups[day].push(s);
		}
		return Object.entries(groups)
			.sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime()) // newest first
			.map(([date, suggestions]) => ({ date, suggestions }));
	});

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
			if ($query.data.data && $query.data.data[1]) {
				const summaries = $query.data.data[1] as RecipeSummary[];
				saveSuggestions(summaries);
			}
		}
	});

	function getFullRecipe(recipe: RecipeSummary) {
		working = true;
		const title = encodeURIComponent(recipe.title);
		// include the `short_description` otherwise AI will write a new one and the generated
		// recipe may very from the description
		const desc = encodeURIComponent(recipe.short_description);
		goto(`/suggestions/recipe?title=${title}&desc=${desc}`);
	}

	function getMoreSuggestions() {}
</script>

<main class="mx-auto min-h-screen max-w-5xl px-4">
	{#if hasPrompt && $query}
		{#if $query.error}
			<div class="mx-auto grid h-screen w-full max-w-3xl place-content-center gap-6">
				<h1 class="fluid-heading-05">Ah donkey-spittle! There was a problem.</h1>
				<p class="flex items-center gap-3">
					<span class="fluid-heading-03">{$query.error.name}</span><span>|</span><span
						>{$query.error?.message}</span
					>
				</p>
			</div>
		{:else if $query.data?.data}
			<div class="py-24">
				<h1 class="fluid-heading-05 mb-8">
					Here are some ideas for, <span class="italic">"{prompt}"</span>
				</h1>
				<List size="three-line">
					{#each $query.data.data[1] as summary}
						<hr />
						<ListItem.Root>
							<ListItem.Button onClick={() => getFullRecipe(summary)} disabled={working}>
								<ListItem.Text primary={summary.title} secondary={summary.short_description} />
								<ViewedBadge viewed={getViewedStatus(summary, summary.title).isViewed} />
							</ListItem.Button>
						</ListItem.Root>
					{/each}
				</List>
				<div class="my-8">
					<Button onClick={getMoreSuggestions} label="Get more ideas">Get more ideas</Button>
				</div>
			</div>
		{:else if $query.data}
			<div class="py-24">
				<h1 class="fluid-heading-05 mb-8">Here's some recipes you haven't made in a while.</h1>
				<List size="three-line">
					{#each $query.data as summary}
						<hr />
						<ListItem.Root>
							<ListItem.Link href="/recipes/{summary.id}">
								<ListItem.Text primary={summary.title} secondary={summary.short_description} />
							</ListItem.Link>
						</ListItem.Root>
					{/each}
				</List>
			</div>
		{:else}
			<div class="mx-auto grid h-screen w-full max-w-3xl place-content-center">
				<ProgressSpinner size="lg" />
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
				<List>
					{#each groupedSuggestions as group}
						<h3 class="heading mt-6 mb-2 dark:text-gray-400">{group.date}</h3>
						{#each group.suggestions as summary}
							<ListItem.Root>
								<ListItem.Button onClick={() => getFullRecipe(summary)} disabled={working}>
									<ListItem.Text primary={summary.title} secondary={summary.short_description} />
									<ViewedBadge viewed={getViewedStatus(summary, summary.title).isViewed} />
								</ListItem.Button>
							</ListItem.Root>
							<hr class="border-gray-200 dark:border-gray-700" />
						{/each}
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
