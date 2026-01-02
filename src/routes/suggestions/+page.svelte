<script lang="ts">
	import { Button } from 'bits-ui';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { liveQuery } from 'dexie';
	
	import { createSuggestionsQuery } from '$lib/api/ai/ai.queries';
	import type { RecipeSuggestion, RecipeSuggestionsResponse } from '$lib/api/ai';
	import type { RecipeSummary } from '$lib/api/recipe';

	import { db } from '$lib/db';
	import { networkStore } from '$lib/stores/network';
	import {
		bulkDeleteSuggestions,
		deleteSuggestion,
		saveSuggestions,
		suggestionHistory,
		getViewedStatus
	} from '$lib/stores/suggestions';
	import type { ViewState } from '$lib/types.js';

	import { AppBar } from '$lib/ui/AppBar/index.js';
	import TrashIcon from '$lib/ui/Icons/TrashIcon.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import ViewedBadge from '$lib/ui/ViewedBadge.svelte';
	import { sanitizePromptInput, generateSuggestionId } from '$lib/utils.js';
	import { deriveAICapability } from '$lib/utils/capabilities';

	let { data } = $props();

	let app = $state({
		view: '' as 'prompt-results' | 'history',
		status: 'loading' as ViewState,
		error: ''
	});

	/** Track what's been saved to prevent duplicates and infinite loops */
	let savedPromptKey = $state<string | null>(null);

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

	/** Create the suggestions query store */
	let suggestionsQueryStore = $derived.by(() => {
		const currentPrompt = prompt ? sanitizePromptInput(encodeURIComponent(prompt)) : null;
		if (!currentPrompt) return null;
		try {
			return createSuggestionsQuery({ prompt: currentPrompt });
		} catch (error) {
			console.error('Failed to create suggestions query:', error);
			return null;
		}
	});

	/** Subscribe to the suggestions query store */
	let suggestionsResult = $derived($suggestionsQueryStore);
	
	/** Get the AI response and compute deterministic IDs */
	let aiSuggestions = $derived.by<RecipeSummary[] | null>(() => {
		const aiSummaries = (suggestionsResult?.data as unknown as RecipeSuggestionsResponse)?.suggestions;
		if (!aiSummaries || !prompt) return null;
		
		// Generate deterministic IDs based on prompt + title
		return aiSummaries.map((summary) => ({
			id: generateSuggestionId(prompt, summary.title),
			created_at: new Date().toISOString(),
			title: summary.title,
			short_description: summary.short_description,
			last_opened: undefined
		}));
	});

	/** IDs of the current prompt's suggestions */
	let currentSuggestionIds = $derived(aiSuggestions?.map(s => s.id) ?? []);

	/** Live query for suggestions from Dexie based on current IDs */
	let suggestionsFromDb = $state<RecipeSummary[]>([]);
	
	/** Render these suggestions - from DB for prompt results */
	let suggestions = $derived(hasPrompt && currentSuggestionIds.length > 0 ? suggestionsFromDb : null);

	/** Save suggestions to Dexie when AI returns results (once per prompt) */
	$effect(() => {
		if (aiSuggestions && prompt) {
			const promptKey = `${prompt}:${aiSuggestions.map(s => s.title).sort().join(',')}`;
			if (promptKey !== savedPromptKey) {
				savedPromptKey = promptKey;
				saveSuggestions(aiSuggestions);
			}
		}
	});

	/** Subscribe to Dexie for the current prompt's suggestions */
	$effect(() => {
		if (currentSuggestionIds.length === 0) {
			suggestionsFromDb = [];
			return;
		}

		const subscription = liveQuery(() => 
			db.suggestions.bulkGet(currentSuggestionIds)
		).subscribe((results) => {
			suggestionsFromDb = results.filter((s): s is RecipeSummary => s !== undefined);
		});

		return () => subscription.unsubscribe();
	});

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
		const groups: Record<string, RecipeSummary[]> = {};
		for (const s of filteredSuggestions) {
			const day = new Date(s.created_at).toLocaleDateString();
			if (!groups[day]) groups[day] = [];
			groups[day].push(s);
		}
		return Object.entries(groups)
			.sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime()) // newest first
			.map(([date, suggestions]) => ({ date, suggestions }));
	});

	/** Manage the UI state based on the query store status */
	$effect(() => {
		if (suggestionsResult) {
			if (suggestionsResult.isSuccess && suggestions) {
				app.status = 'idle';
			} else if (suggestionsResult.isError) {
				app.status = 'error';
				app.error = (suggestionsResult.error as unknown as { body: { message: string } })?.body?.message ?? 'Unknown error';
			}
		} else if (hasPrompt) {
			app.status = 'loading';
		} else {
			app.status = 'idle';
		}
	});

	// Filter suggestions
	function filterSuggestions(value: string) {
		const lower = value.toLowerCase();
		return $suggestionHistory.filter(
			(s) =>
				s.title.toLowerCase().includes(lower) || s.short_description.toLowerCase().includes(lower)
		);
	}

	/** Request the full recipe from the API */
	function getFullRecipe(recipe: RecipeSummary) {
		if (!canRequestSuggestions) {
			return;
		}
		const sid = encodeURIComponent(recipe.id);
		const title = encodeURIComponent(recipe.title);
		// include the `short_description` otherwise AI will write a new one and the generated
		// recipe may vary from the description
		const desc = encodeURIComponent(recipe.short_description);
		goto(`/suggestions/recipe?sid=${sid}&title=${title}&description=${desc}`);
	}

	function clearSuggestions() {
		bulkDeleteSuggestions();
		goto('/suggestions');
	}
</script>

<div
	class="grid h-screen"
	style:place-content={app.status === 'idle' ? 'start stretch' : 'center'}
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
				<h1 class="display-medium">AI suggestions are unavailable.</h1>
				<p>{aiRestrictionMessage}</p>
			</div>
		{:else if suggestionsResult?.isError}
			<div class="flex flex-col gap-6">
				<h1 class="display-medium">Ah donkey-spittle! There was a problem.</h1>
				<p class="flex items-center gap-3 text-dark">
					<span class="fluid-heading-03">{(suggestionsResult.error as unknown as { status: number })?.status}</span><span>|</span><span
						>{(suggestionsResult.error as unknown as { body: { message: string } })?.body?.message}</span
					>
				</p>
			</div>
		{:else if suggestionsResult?.isSuccess && suggestions}
			<div class="mx-auto max-w-5xl px-4 py-8 lg:px-8">
				<h1 class="display-medium mb-8">
					Here are some ideas for, <span class="italic">"{prompt}"</span>
				</h1>
				<div class="list">
					{#each suggestions as summary (summary.title)}
						<hr />
						<Button.Root onclick={() => getFullRecipe(summary)} disabled={app.status === 'loading' || !canRequestSuggestions} class="listitem button text narrow">
							<span class="listitem__content">
								<span class="title-medium">{summary.title}</span>
								<span class="body-medium text-foreground-alt dark:text-foreground-alt">{summary.short_description}</span>
							</span>
							<span class="listitem__end">
								<ViewedBadge viewed={getViewedStatus(summary, summary.title).isViewed} />
							</span>
						</Button.Root>
					{/each}
				</div>
			</div>
		{:else}
			<ProgressSpinner size="lg" />
		{/if}
	{:else}
		<div>
			<PageHeader>
				<AppBar.Root>
					<AppBar.End>
						{#if app.status === 'loading'}
							<div class="grid h-10 w-10 place-content-center">
								<ProgressSpinner size="xs" />
							</div>
						{/if}
						<Button.Root onclick={clearSuggestions} class="button text narrow mr-2">
							<TrashIcon size="xs" />
							<span>Clear history</span>
						</Button.Root>
					</AppBar.End>
				</AppBar.Root>
			</PageHeader>
			<div class="mx-auto max-w-5xl px-4 py-8 lg:px-8">
				<h1 class="display-medium mb-4">Suggestion History</h1>
				<p class="body-medium mb-10">Suggestions are deleted after 30 days.</p>
				{#if $suggestionHistory.length > 0}
					<div class="w-full">
						<input
							type="text"
							class="label flex h-12 w-full flex-row flex-nowrap items-stretch rounded-sm border border-gray-200 px-3 dark:border-gray-700 dark:bg-gray-900 hover:dark:bg-gray-800"
							placeholder="Search history"
							bind:value={search}
						/>
					</div>
				{/if}
				{#if filteredSuggestions.length > 0}
					<div class="list">
						{#each groupedSuggestions as group (group.date)}
							<h3 class="title-small text-foreground-alt mt-6 mb-2"><strong>{group.date}</strong></h3>
							{#each group.suggestions as summary (summary.id)}
								<hr />
								<Button.Root
									onclick={() => getFullRecipe(summary)}
									disabled={app.status === 'loading' || !canRequestSuggestions}
									class="listitem button text narrow"
								>
									<span class="listitem__content">
										<span class="title-medium">{summary.title}</span>
										<span class="body-medium text-foreground-alt dark:text-foreground-alt">{summary.short_description}</span>
									</span>
									<span class="listitem__end">
										<ViewedBadge viewed={getViewedStatus(summary, summary.title).isViewed} />
										<Button.Root
											onclick={
												(event: MouseEvent) => {
													event.stopPropagation();
													deleteSuggestion(summary.id)
												}
											}
											class="button icon text"
										>
											<TrashIcon size="xs" />
										</Button.Root>
									</span>
								</Button.Root>
							{/each}
						{/each}
					</div>
				{:else}
					<p class="body-medium">
						Your suggestion history will appear year after you start requesting recipe suggestions.
					</p>
				{/if}
			</div>
		</div>
	{/if}
</div>
