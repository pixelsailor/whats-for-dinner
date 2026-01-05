<script lang="ts">
	import { Button } from 'bits-ui';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	
	import { createSuggestionsQuery } from '$lib/api/ai/ai.queries';
	import type { RecipeSuggestionsResponse } from '$lib/api/ai';
	import type { RecipeSummary, Suggestion } from '$lib/api/recipe';

	import { networkStore } from '$lib/stores/network';
	import {
		bulkDeleteSuggestions,
		deleteSuggestion,
		getPromptRequestWithThrottle,
		getViewedStatus,
		saveSuggestions,
		savePromptRequest,
		suggestionHistory,
		suggestionsByPromptStore
	} from '$lib/stores/suggestions';
	import type { ViewState } from '$lib/types.js';

	import { AppBar } from '$lib/ui/AppBar/index.js';
	import TrashIcon from '$lib/ui/Icons/TrashIcon.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import ViewedBadge from '$lib/ui/ViewedBadge.svelte';
	import { sanitizePromptInput } from '$lib/utils.js';
	import { deriveAICapability } from '$lib/utils/capabilities';

	let { data } = $props();

	// =============================================================================
	// State
	// =============================================================================
	
	let app = $state({
		status: 'loading' as ViewState,
		error: ''
	});

	/** Track existing request from Dexie to prevent duplicate API calls */
	let existingRequestState = $state<{
		checked: boolean;
		hasExisting: boolean;
		requestId: number | null;
	}>({
		checked: false,
		hasExisting: false,
		requestId: null
	});

	/** Track if we've already saved the current response to prevent duplicate saves */
	let savedRequestId = $state<number | null>(null);

	// =============================================================================
	// Derived State - Network & AI Capabilities
	// =============================================================================
	
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

	// =============================================================================
	// URL Parameters
	// =============================================================================
	
	const prompt = $derived(page.url.searchParams.get('prompt'));
	const requestIdFromUrl = $derived(page.url.searchParams.get('request_id'));
	const hasPrompt = $derived(!!prompt);
	const sanitizedPrompt = $derived(prompt ? sanitizePromptInput(prompt) : null);

	// =============================================================================
	// Dexie-First: Check for existing request before making API call
	// =============================================================================

	/**
	 * Check Dexie for existing prompt request when prompt changes.
	 * This runs once per prompt change and determines if we need to call the API.
	 */
	$effect(() => {
		if (!sanitizedPrompt) {
			existingRequestState = { checked: true, hasExisting: false, requestId: null };
			return;
		}

		// If we have a request_id in the URL, we already have this data
		if (requestIdFromUrl) {
			existingRequestState = {
				checked: true,
				hasExisting: true,
				requestId: Number(requestIdFromUrl)
			};
			return;
		}

		// Check Dexie for existing request (with 5-second throttle)
		existingRequestState = { checked: false, hasExisting: false, requestId: null };
		
		getPromptRequestWithThrottle(sanitizedPrompt, 5000).then((existingRequest) => {
			if (existingRequest) {
				existingRequestState = {
					checked: true,
					hasExisting: true,
					requestId: existingRequest.request_id
				};
				// Update URL with the existing request_id
				const url = new URL(page.url);
				url.searchParams.set('request_id', existingRequest.request_id.toString());
				goto(url.toString(), { replaceState: true, noScroll: true });
			} else {
				existingRequestState = { checked: true, hasExisting: false, requestId: null };
			}
		});
	});

	// =============================================================================
	// Conditional API Query
	// Only create the query if no existing request found
	// =============================================================================
	
	/** Determine if we should make an API request */
	let shouldRequestFromApi = $derived(
		hasPrompt &&
		sanitizedPrompt &&
		canRequestSuggestions &&
		existingRequestState.checked &&
		!existingRequestState.hasExisting
	);

	/** Create TanStack query only when needed */
	let suggestionsQueryStore = $derived.by(() => {
		if (!shouldRequestFromApi || !sanitizedPrompt) return null;
		
		try {
			return createSuggestionsQuery({ prompt: encodeURIComponent(sanitizedPrompt) });
		} catch (error) {
			console.error('Failed to create suggestions query:', error);
			return null;
		}
	});

	/** Subscribe to query results */
	let suggestionsResult = $derived($suggestionsQueryStore);

	// =============================================================================
	// LiveQuery Store for Suggestions from Dexie
	// Always display from Dexie, not directly from API response
	// =============================================================================
	
	/** Create LiveQuery store for suggestions by prompt */
	let promptSuggestionsStore = $derived.by(() => {
		if (!sanitizedPrompt) return null;
		return suggestionsByPromptStore(sanitizedPrompt);
	});

	/** Subscribe to suggestions from Dexie */
	let promptSuggestionsResult = $derived($promptSuggestionsStore);
	let suggestionsFromDexie = $derived(promptSuggestionsResult?.data ?? []);

	// =============================================================================
	// Save API Response to Dexie
	// =============================================================================
	
	/**
	 * When API returns results, save to Dexie and update URL.
	 * This effect handles the write-through to IndexedDB.
	 */
	$effect(() => {
		if (!suggestionsResult?.isSuccess || !suggestionsResult.data || !sanitizedPrompt || !prompt) {
			return;
		}

		const raw = suggestionsResult.data as unknown;
		let requestId = Date.now();
		let suggestionsPayload: { title: string; short_description: string }[] | null = null;

		if (raw && typeof raw === 'object' && 'suggestions' in (raw as Record<string, unknown>)) {
			const response = raw as RecipeSuggestionsResponse;
			requestId = response.request_id ?? requestId;
			suggestionsPayload = response.suggestions;
		} else if (Array.isArray(raw)) {
			// Backward compatibility if API returned an array directly
			suggestionsPayload = raw as { title: string; short_description: string }[];
		}

		if (!suggestionsPayload || suggestionsPayload.length === 0) {
			return;
		}

		// Prevent duplicate saves
		if (savedRequestId === requestId) return;
		savedRequestId = requestId;

		// Transform AI response to RecipeSummary with deterministic IDs
		const suggestions: RecipeSummary[] = suggestionsPayload.map((summary) => ({
			id: crypto.randomUUID(),
			created_at: new Date().toISOString(),
			title: summary.title,
			short_description: summary.short_description,
			last_opened: undefined
		}));

		// Save to Dexie: both suggestions and prompt request
		Promise.all([
			saveSuggestions(suggestions),
			savePromptRequest(requestId, sanitizedPrompt, suggestions)
		]).then(() => {
			// Update URL with request_id for future reference
			const url = new URL(page.url);
			url.searchParams.set('request_id', requestId.toString());
			goto(url.toString(), { replaceState: true, noScroll: true });
		});
	});

	// =============================================================================
	// View State Management
	// =============================================================================
	
	/** Computed view state based on all conditions */
	let viewState = $derived.by<'loading' | 'error' | 'idle-prompt' | 'idle-history'>(() => {
		// No prompt = show history
		if (!hasPrompt) return 'idle-history';
		
		// API error
		if (suggestionsResult?.isError) return 'error';
		
		// Still checking Dexie for existing request
		if (!existingRequestState.checked) return 'loading';
		
		// API request in progress
		if (shouldRequestFromApi && suggestionsResult?.isPending) return 'loading';
		
		// Have suggestions to display (from Dexie or just saved)
		if (suggestionsFromDexie.length > 0) return 'idle-prompt';
		
		// Waiting for LiveQuery to populate after save
		if (suggestionsResult?.isSuccess) return 'loading';
		
		// Still waiting for API or Dexie
		return 'loading';
	});

	/** Update app.status for template compatibility */
	$effect(() => {
		if (viewState === 'error') {
			app.status = 'error';
			app.error = (suggestionsResult?.error as unknown as { body: { message: string } })?.body?.message ?? 'Unknown error';
		} else if (viewState === 'loading') {
			app.status = 'loading';
		} else {
			app.status = 'idle';
		}
	});

	// =============================================================================
	// Suggestion History (for no-prompt view)
	// =============================================================================
	
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
			const day = new Date(s.created_at!).toLocaleDateString();
			if (!groups[day]) groups[day] = [];
			groups[day].push(s);
		}
		return Object.entries(groups)
			.sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime()) // newest first
			.map(([date, suggestions]) => ({ date, suggestions }));
	});

	// =============================================================================
	// Actions
	// =============================================================================

	// Filter suggestions
	function filterSuggestions(value: string) {
		const lower = value.toLowerCase();
		return $suggestionHistory.filter(
			(s) =>
				s.title.toLowerCase().includes(lower) || s.short_description.toLowerCase().includes(lower)
		);
	}

	/** Navigate to full recipe page */
	function getFullRecipe(recipe: RecipeSummary | Suggestion) {
		if (!canRequestSuggestions) {
			return;
		}
		const id = encodeURIComponent(recipe.id);
		const title = encodeURIComponent(recipe.title);
		// include the `short_description` otherwise AI will write a new one and the generated
		// recipe may vary from the description
		const desc = encodeURIComponent(recipe.short_description);
		if (id) {
			// Recipe should already exist in Suggestions DB
			goto(`/suggestions/recipe?id=${id}&title=${title}&description=${desc}`);
		} else {
			goto(`/suggestions/recipe?title=${title}&description=${desc}`);
		}
	}

	function clearSuggestions() {
		bulkDeleteSuggestions();
		goto('/suggestions');
	}
</script>

<div
	class="grid h-screen"
	style:place-content={viewState === 'idle-prompt' || viewState === 'idle-history' ? 'start stretch' : 'center'}
>
	{#if aiRestrictionMessage && hasPrompt}
		<div
			class="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100"
		>
			{aiRestrictionMessage}
		</div>
	{/if}

	{#if viewState === 'idle-history'}
		<!-- Suggestion History View -->
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
				<h1 class="display-small mb-4">Suggestion History</h1>
				<p class="body-medium mb-10">Suggestions are not synced between devices and are deleted after 30 days.</p>
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
						Your suggestion history will appear here after you start requesting recipe suggestions.
					</p>
				{/if}
			</div>
		</div>
	{:else if viewState === 'error'}
		<!-- Error View -->
		<div class="flex flex-col gap-6">
			<h1 class="display-medium">Ah donkey-spittle! There was a problem.</h1>
			<p class="flex items-center gap-3 text-dark">
				<span class="fluid-heading-03">{(suggestionsResult?.error as unknown as { status: number })?.status}</span>
				<span>|</span>
				<span>{(suggestionsResult?.error as unknown as { body: { message: string } })?.body?.message}</span>
			</p>
		</div>
	{:else if viewState === 'idle-prompt'}
		<!-- Prompt Results View (from Dexie) -->
		<div class="mx-auto max-w-5xl w-full px-4 py-18 lg:px-8">
			<h1 class="headline-medium mb-8">
				Here are some ideas for, <span class="italic">"{prompt}"</span>
			</h1>
			<div class="list">
				{#each suggestionsFromDexie as summary (summary.id)}
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
						</span>
					</Button.Root>
				{/each}
			</div>
		</div>
	{:else if viewState === 'loading'}
		<!-- Loading View -->
		{#if !canRequestSuggestions && hasPrompt}
			<div>
				<h1 class="display-medium">AI suggestions are unavailable.</h1>
				<p>{aiRestrictionMessage}</p>
			</div>
		{:else}
			<ProgressSpinner size="lg" />
		{/if}
	{/if}
</div>
