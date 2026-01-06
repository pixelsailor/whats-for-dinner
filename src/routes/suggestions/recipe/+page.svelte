<script lang="ts">
	import { Button } from 'bits-ui';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { toast } from 'svelte-sonner';

	import { db } from '$lib/db';
	import { sanitizePromptInput } from '$lib/utils';
	import { createFullRecipeQuery } from '$lib/api/ai/ai.queries';
	import type { Recipe as FullRecipe, SavedRecipe, Suggestion } from '$lib/api/recipe';
	import { suggestionStoreById } from '$lib/stores/suggestions';

	import { AppBar } from '$lib/ui/AppBar';
	import BackIcon from '$lib/ui/icons/BackIcon.svelte';
	import BookmarkIcon from '$lib/ui/icons/BookmarkIcon.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import Recipe from '$lib/ui/Recipe.svelte';
	import { networkStore } from '$lib/stores/network';
	import { deriveAICapability } from '$lib/utils/capabilities';
	import type { ViewState } from '$lib/types.js';
	import { CloudService, SyncService } from '$lib/api/cloud';

	let { data } = $props();

	// =============================================================================
	// State
	// =============================================================================
	
	let app = $state({
		status: 'loading' as ViewState,
		error: ''
	});

	let currentUserId = $state<string | undefined>(undefined);
	let cloudService: CloudService | undefined = $state(undefined);
	let syncService: SyncService | undefined = $state(undefined);

	/** Track if we've saved the full recipe to prevent duplicate saves */
	let savedFullRecipeId = $state<string | null>(null);

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
	let canUseAI = $derived(aiCapability.canUseAI);
	let aiRestrictionMessage = $derived.by(() => {
		switch (aiCapability.reason) {
			case 'offline':
				return 'You are offline. Reconnect to request full recipes or adjustments.';
			case 'disabled':
				return 'AI recipe details are unavailable in this build.';
			case 'unauthenticated':
				return 'Log in to request full recipes.';
			case 'unauthorized':
				return 'Your account does not include AI recipe requests.';
			default:
				return '';
		}
	});

	let hasCloudStorageAccess = $derived(data.permissions?.cloudSync.allowed ?? false);

	// =============================================================================
	// URL Parameters
	// =============================================================================
	
	const id = $derived(page.url.searchParams.get('id'));
	const title = $derived(page.url.searchParams.get('title'));
	const description = $derived(page.url.searchParams.get('description'));
	const hasTitleAndDescription = $derived(!!title && !!description);

	// =============================================================================
	// Dexie-First: Load suggestion from IndexedDB via LiveQuery
	// =============================================================================
	
	/** Create LiveQuery store for suggestion by id */
	let suggestionStore = $derived.by(() => {
		if (!id) return null;
		try {
			return suggestionStoreById(id);
		} catch {
			return null;
		}
	});

	/** Subscribe to suggestion from Dexie */
	let suggestionResult = $derived($suggestionStore);
	let suggestionFromDexie = $derived(suggestionResult?.data ?? null);
	let suggestionLoading = $derived(suggestionResult?.loading ?? false);
	let suggestionError = $derived(suggestionResult?.error ?? null);

	/** Check if the suggestion has a full recipe (ingredients + instructions) */
	let hasFullRecipeInDexie = $derived(
		suggestionFromDexie && 
		'ingredients' in suggestionFromDexie && 
		'instructions' in suggestionFromDexie &&
		!!suggestionFromDexie.ingredients &&
		!!suggestionFromDexie.instructions
	);

	// =============================================================================
	// Conditional API Query
	// Only create the query if no full recipe exists in Dexie
	// =============================================================================
	
	/** Determine if we should make an API request */
	let shouldRequestFromApi = $derived(
		hasTitleAndDescription &&
		canUseAI &&
		!suggestionLoading &&
		!hasFullRecipeInDexie &&
		!suggestionError
	);

	/** Create TanStack query only when needed */
	let recipeQueryStore = $derived.by(() => {
		if (!shouldRequestFromApi || !title || !description) return null;
		
		const sanitizedTitle = sanitizePromptInput(encodeURIComponent(title));
		const sanitizedDescription = sanitizePromptInput(encodeURIComponent(description));
		
		try {
			return createFullRecipeQuery({
				title: sanitizedTitle,
				description: sanitizedDescription
			});
		} catch (error) {
			console.error('Failed to create full recipe query:', error);
			return null;
		}
	});

	/** Subscribe to query results */
	let recipeQueryResult = $derived($recipeQueryStore);
	let recipeFromApi = $derived((recipeQueryResult?.data as unknown as FullRecipe) ?? null);

	// =============================================================================
	// Recipe Display - Always prefer Dexie, fallback to API response
	// =============================================================================
	
	/** The recipe to display - Dexie-first approach */
	let recipe = $derived.by<FullRecipe | Suggestion | null>(() => {
		// Priority 1: Full recipe from Dexie
		if (hasFullRecipeInDexie && suggestionFromDexie) {
			return suggestionFromDexie as Suggestion;
		}
		// Priority 2: Recipe from API (will be saved to Dexie)
		if (recipeFromApi) {
			return recipeFromApi as FullRecipe;
		}
		return null;
	});

	/** Check if we have a recipe ready to display (from any source) */
	let hasRecipe = $derived(!!recipe);

	/** Check if the recipe has been viewed (has last_opened set) */
	let isViewed = $derived(
		suggestionFromDexie && 
		'last_opened' in suggestionFromDexie && 
		!!suggestionFromDexie.last_opened
	);

	// =============================================================================
	// Save API Response to Dexie
	// =============================================================================
	
	/**
	 * When API returns a full recipe, save it to Dexie and mark as viewed.
	 * This effect handles the write-through to IndexedDB.
	 */
	$effect(() => {
		if (!recipeFromApi || !id || hasFullRecipeInDexie) return;
		
		// Prevent duplicate saves
		if (savedFullRecipeId === id) return;
		savedFullRecipeId = id;

		// Save full recipe to Dexie and mark as viewed
		saveFullRecipeToDexie(id, recipeFromApi);
	});

	/** Save full recipe to suggestion in Dexie */
	async function saveFullRecipeToDexie(suggestionId: string, fullRecipe: FullRecipe) {
		try {
			await db.suggestions.update(suggestionId, {
				...fullRecipe,
				last_opened: new Date().toISOString()
			});
		} catch (error) {
			console.error('Failed to save full recipe to Dexie:', error);
		}
	}

	// =============================================================================
	// View State Management
	// =============================================================================
	
	/** Computed view state based on all conditions */
	let viewState = $derived.by<'loading' | 'error' | 'idle' | 'no-ai'>(() => {
		// AI not available
		if (!canUseAI && !hasFullRecipeInDexie) return 'no-ai';
		
		// API error
		if (recipeQueryResult?.isError) return 'error';
		
		// Suggestion not found in Dexie
		if (suggestionError) return 'error';
		
		// Have recipe to display
		if (hasRecipe) return 'idle';
		
		// Still loading from Dexie
		if (suggestionLoading) return 'loading';
		
		// API request in progress
		if (shouldRequestFromApi && recipeQueryResult?.isPending) return 'loading';
		
		// Default to loading
		return 'loading';
	});

	/** Update app.status for template compatibility */
	$effect(() => {
		if (viewState === 'error') {
			app.status = 'error';
			app.error = suggestionError?.message ?? 
				(recipeQueryResult?.error as unknown as { body: { message: string } })?.body?.message ?? 
				'Unknown error';
		} else if (viewState === 'loading') {
			app.status = 'loading';
		} else {
			app.status = 'idle';
		}
	});

	// =============================================================================
	// Cloud Service Setup
	// =============================================================================
	
	/**
	 * Manage services for cloud and sync operations.
	 */
	$effect(() => {
		const userId = data.user?.id;
		if (userId && userId !== currentUserId) {
			cloudService = new CloudService(data.supabase, userId);
			syncService = new SyncService(cloudService);
			currentUserId = userId;
		} else if (!userId && currentUserId) {
			cloudService = undefined;
			syncService = undefined;
			currentUserId = undefined;
		}
	});

	// =============================================================================
	// Actions
	// =============================================================================

	function goBack() {
		window.history.back();
	}

	/**
	 * Save to the User's recipe book
	 */
	async function saveRecipe() {
		if (!recipe) return;
		app.status = 'loading';

		let candidate: SavedRecipe | undefined = undefined;

		if (hasCloudStorageAccess && cloudService) {
			try {
				// Avoid destructuring 'recipe_id' as it may not exist; remove it safely if present
				const { recipe_id, ...rest } = recipe as Record<string, unknown>;
				const recipeToUpload = { ...rest } as FullRecipe;
				candidate = await cloudService.uploadLocalRecipe(recipeToUpload);

				await db.recipes.put(candidate);
				if (id) {
					await db.suggestions.update(id, { recipe_id: candidate.id });
				}
				toast.success('Recipe saved');
				goto(`/recipes/${candidate.id}`, { replaceState: true });
			} catch (err) {
				console.error('Cloud save failed; continuing locally', err);
				candidate = createSavedRecipe(recipe as FullRecipe, err instanceof Error ? err.message : 'Unknown sync error');
				await db.recipes.put(candidate);
				if (id) {
					await db.suggestions.update(id, { recipe_id: candidate.id });
				}
				toast.info('Recipe saved locally but failed to sync to cloud');
			} finally {
				app.status = 'idle';
			}
		} else {
			candidate = createSavedRecipe(recipe as FullRecipe);
			await db.recipes.put(candidate);
			if (id) {
				await db.suggestions.update(id, { recipe_id: candidate.id });
			}
			toast.success('Recipe saved');
			goto(`/recipes/${candidate.id}`, { replaceState: true });
		}
	}

	function createSavedRecipe(recipe: FullRecipe, error?: string): SavedRecipe {
		const now = new Date().toISOString();
		const fullRecipe = {
			...recipe,
			created_at: now,
			updated_at: now,
			synced: false,
			sync_error: error ?? null,
			id: crypto.randomUUID(),
			archived: null,
			deleted_at: null,
			last_opened: now,
			version: 1,
			is_current: true,
			is_favorite: false,
			owner_id: null,
			shared_id: null,
			last_synced_at: null,
			parent_id: null,
			checkout_history: [now],
		};
		if ('recipe_id' in fullRecipe) {
			delete fullRecipe.recipe_id;
		}
		return fullRecipe;
	}

	/** @todo - Add support for AI-assisted recipe editing. DO NOT REMOVE THE FOLLOWING COMMENTED CODE. */
	// let overriddenRecipe = $state<FullRecipe | null>(null);
	// let fullRecipe = $derived(overriddenRecipe ?? recipeFromQuery ?? null);
	// let hasUnsavedChanges = $derived(Boolean(overriddenRecipe));

	// Responsible for passing the recipe to the FormData
	// let recipeJson = $derived.by(() => (recipe ? JSON.stringify(recipe) : ''));

	// let promptInput = $state<string>();

	// let promptType = $state<PromptContext>();

	// let promptRef = $state<HTMLElement>();

	// let promptHeight = $derived(promptRef?.clientHeight);

	// let conversationMsg = $state<string>();

	// let lastFormMessage: string | undefined = undefined;

	// Handle prompt responses
	// $effect(() => {
	// 	if (form && form.error === undefined) {
	// 		if (form.message === lastFormMessage) return;

	// 		const { type, message } = form;
	// 		if (typeof message !== 'string') {
	// 			console.error('Unexpected AI payload', message);
	// 			toast.error('There was a problem parsing the recipe response');
	// 			working = false;
	// 			return;
	// 		}

	// 		const messageText = message;
	// 		promptType = type;
	// 		lastFormMessage = messageText;
	// 		working = false;

	// 		if (type === 'assistance') {
	// 			conversationMsg = messageText;
	// 		} else {
	// 			try {
	// 				overriddenRecipe = JSON.parse(messageText) as FullRecipe;
	// 				toast.success(`"${overriddenRecipe.title}" updated`);
	// 			} catch (err) {
	// 				console.error(err);
	// 				toast.error('There was a problem parsing the recipe JSON');
	// 			}
	// 		}
	// 	} else if (form && form.error) {
	// 		working = false;
	// 		console.error(form.error);
	// 		toast.error(`${form.error}`);
	// 	}
	// });
</script>

<div
	class="grid h-screen"
	style:place-content={viewState === 'idle' ? 'start stretch' : 'center'}
>
	{#if viewState === 'no-ai'}
		<!-- AI Not Available -->
		<div
			class="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100"
		>
			{aiRestrictionMessage}
		</div>
	{:else if viewState === 'error'}
		<!-- Error View -->
		<div class="mx-auto grid h-max w-full max-w-3xl place-content-center">
			<h1 class="display-medium my-8">Ah donkey-spittle! There was a problem.</h1>
			<p class="flex items-center gap-3">
				{#if suggestionError}
					{suggestionError.message}
				{:else}
					A recipe matching the provided title could not be found.
				{/if}
			</p>
		</div>
	{:else if viewState === 'idle' && recipe}
		<!-- Recipe View (from Dexie or API) -->
		<div>
			<PageHeader>
				<AppBar.Root>
					<Button.Root onclick={goBack} class="button text narrow -ml-2">
						<BackIcon size="xs" />
						<span>Back to suggestions</span>
					</Button.Root>
					<AppBar.End>
						{#if app.status === 'loading'}
							<div class="grid h-10 w-10 place-content-center">
								<ProgressSpinner size="xs" />
							</div>
						{/if}
						<Button.Root onclick={saveRecipe} class="button text narrow mr-2">
							<BookmarkIcon size="xs" />
							<span>Save recipe</span>
						</Button.Root>
					</AppBar.End>
				</AppBar.Root>
			</PageHeader>
			<article class="mx-auto max-w-5xl px-4 py-8 lg:px-8">
				<Recipe {recipe} />
			</article>
		</div>
		<!-- <Button onClick={saveRecipe} label="Save to My Recipes" disabled={working} size="sm">
			<BookmarkIcon size="xs" />
			Save to My Recipes
		</Button> -->
		<!-- <div class="fixed right-0 bottom-0 px-4" bind:this={promptRef}>
			<Prompt>
				{#if conversationMsg}
					<div
						class="flex flex-row items-start gap-2"
						transition:slide={{ duration: 500, axis: 'y' }}
					>
						<div class="markdown mb-4 self-center text-sm">
							<SvelteMarkdown source={conversationMsg} />
						</div>
						<Button
							onClick={() => (conversationMsg = '')}
							label="Close"
							size="xs"
							icon
							class="-m-2"
						>
							<CloseIcon />
						</Button>
					</div>
				{/if}
				<form
					class="flex w-full flex-row gap-2"
					method="POST"
					use:enhance={() => {
						working = true;
					}}
				>
					<input
						class="grow p-1 border-none bg-gray-100 dark:bg-gray-900 placeholder:text-gray-500 dark:placeholder:text-gray-400"
						type="text"
						name="input"
						bind:value={promptInput}
						placeholder="Make changes or ask a recipe related question"
					/>
					<input type="hidden" name="recipe" bind:value={recipeJson} />
					<Button type="submit" label="Submit request" disabled={working || !promptInput?.trim()}
						>{working ? 'Thinking...' : 'Submit'}</Button
					>
				</form>
			</Prompt>
		</div> -->
	{:else if viewState === 'loading'}
		<!-- Loading View -->
		<ProgressSpinner size="lg" />
	{/if}
</div>
