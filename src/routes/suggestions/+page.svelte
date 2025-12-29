<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	// import { createSuggestionsQuery as createSuggestionsQueryRecipes } from '$lib/queries/recipes';
	import { createSuggestionsQuery } from '$lib/api/ai/ai.queries';
	// import { recommendedRecipes } from '$lib/stores/recommendations.js';
	import {
		bulkDeleteSuggestions,
		saveSuggestions,
		suggestionHistory,
		getViewedStatus
	} from '$lib/stores/suggestions';
	import type { RecipeSummary, Suggestion } from '$lib/api/recipe';
	// import { AppBar } from '$lib/ui/AppBar/index.js';
	import Button from '$lib/ui/Button/Button.svelte';
	// import TrashIcon from '$lib/ui/Icons/TrashIcon.svelte';
	import { List, ListItem } from '$lib/ui/List';
	// import PageHeader from '$lib/ui/PageHeader.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import ViewedBadge from '$lib/ui/ViewedBadge.svelte';
	import { networkStore } from '$lib/stores/network';
	import { deriveAICapability } from '$lib/utils/capabilities';
	import type { ViewState } from '$lib/types.js';
	import type { RecipeSuggestion, RecipeSuggestionsResponse } from '$lib/api/ai';

	/**
	 * `/routes/suggestions` is for handling LLM responses. While it uses the User's local preference
	 * data for customizing the suggestion prompt, this page requires LLM API access at all times.
	 * `/routes/recommendations` on the other hand is completely in browser and should not have
	 * a server requirement.
	 */

	let { data } = $props();

	let app = $state({
		view: 'loading' as ViewState | 'suggestions' | 'history',
		error: ''
	});

	// let userPreferences = $derived(data.preferences || '');
	let network = $derived($networkStore);
	let aiCapability = $derived(
		deriveAICapability({
			session: data.session,
			permissions: data.permissions,
			featureFlags: data.featureFlags,
			online: network.online
		})
	);
	let canRequestSuggestions = $derived(aiCapability.canUseAI);
	let aiRestrictionMessage = $derived.by(() => {
		switch (aiCapability.reason) {
			case 'offline':
				return 'You are offline. Reconnect to request new recipe ideas.';
			case 'disabled':
				return 'AI suggestions are unavailable in this build.';
			case 'unauthenticated':
				return 'Log in to request recipe suggestions.';
			case 'unauthorized':
				return 'Your account does not include AI suggestions.';
			default:
				return '';
		}
	});

	/** Recipe title and description from the URL params */
	const prompt = $derived(page.url.searchParams.get('prompt'));
	const hasPrompt = $derived(!!prompt);

	type SuggestionsQueryStore = Exclude<ReturnType<typeof createSuggestionsQuery>, null>;
	type SuggestionsResult = Parameters<
		Parameters<SuggestionsQueryStore['subscribe']>[0]
	>[0];

	let suggestionsStore = $state<SuggestionsQueryStore | null>(null);
	let suggestionsResult = $state<SuggestionsResult | null>(null);
	
	let suggestions = $derived((suggestionsResult?.data as unknown as RecipeSuggestionsResponse)?.suggestions || null);

	$effect(() => {
		const currentPrompt = prompt;
		if (!currentPrompt || !canRequestSuggestions) {
			suggestionsStore = null;
			suggestionsResult = null;
			return;
		}

		const store = createSuggestionsQuery({ prompt: currentPrompt });
		if (!store) {
			suggestionsStore = null;
			suggestionsResult = null;
			return;
		}

		suggestionsStore = store;

		const unsubscribe = store.subscribe((value) => {
			console.log('store subscription as results', value);
			suggestionsResult = value;
		});

		return () => {
			unsubscribe();
			suggestionsStore = null;
			suggestionsResult = null;
		};
	});

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
	// $effect(() => {
	// 	if (hasPrompt && suggestions) {
	// 		saveSuggestions(suggestions);
	// 	}
	// });

	function getFullRecipe(recipe: RecipeSummary) {
		if (!canRequestSuggestions) {
			return;
		}

		working = true;
		const title = encodeURIComponent(recipe.title);
		// include the `short_description` otherwise AI will write a new one and the generated
		// recipe may very from the description
		const desc = encodeURIComponent(recipe.short_description);
		goto(`/suggestions/recipe?title=${title}&description=${desc}`);
	}

	function getMoreSuggestions() {}
</script>

<div
	class="grid h-screen mx-auto max-w-5xl px-4 py-8 lg:px-8"
	style:place-content={suggestionsResult?.isSuccess ? 'start stretch' : 'center'}
>
	{#if aiRestrictionMessage}
		<div
			class="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100"
		>
			{aiRestrictionMessage}
		</div>
	{/if}

	{#if hasPrompt}
		{#if !canRequestSuggestions}
			<div>
				<h1 class="fluid-heading-05">AI suggestions are unavailable.</h1>
				<p>{aiRestrictionMessage}</p>
			</div>
		{:else if suggestionsResult}
			{#if suggestionsResult.isError}
				<div class="flex flex-col gap-6">
					<h1 class="fluid-heading-05">Ah donkey-spittle! There was a problem.</h1>
					<p class="flex items-center gap-3 text-dark">
						<span class="fluid-heading-03">{(suggestionsResult.error as unknown as { status: number })?.status}</span><span>|</span><span
							>{(suggestionsResult.error as unknown as { body: { message: string } })?.body?.message}</span
						>
					</p>
				</div>
			{:else if suggestions}
				<div>
					<h1 class="fluid-heading-04 mb-8">
						Here are some ideas for, <span class="italic">"{prompt}"</span>
					</h1>
					<List size="three-line">
						{#each suggestions as summary (summary.title)}
							<hr />
							<ListItem.Root>
								<ListItem.Button
									onClick={() => getFullRecipe(summary)}
									disabled={working || !canRequestSuggestions}
								>
									<ListItem.Text primary={summary.title} secondary={summary.short_description} />
									<ViewedBadge viewed={getViewedStatus(summary, summary.title).isViewed} />
								</ListItem.Button>
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
					{#each groupedSuggestions as group (group.date)}
						<h3 class="heading mt-6 mb-2 dark:text-gray-400">{group.date}</h3>
						{#each group.suggestions as summary (summary.title)}
							<ListItem.Root>
								<ListItem.Button
									onClick={() => getFullRecipe(summary)}
									disabled={working || !canRequestSuggestions}
								>
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
</div>
