<script lang="ts">
	import { Button } from 'bits-ui';

	import { enhance } from '$app/forms';
	import { beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';

	import { db } from '$lib/db';
	import { sanitizePromptInput } from '$lib/utils';
	// import type { PromptContext } from '$lib/api/ai';
	import { createFullRecipeQuery } from '$lib/api/ai/ai.queries'; // Do not import via index.ts -- Creates an "impossible situation"
	import type { Recipe as FullRecipe, SavedRecipe, RecipeSummary } from '$lib/api/recipe';

	import { AppBar } from '$lib/ui/AppBar';
	import BackIcon from '$lib/ui/Icons/BackIcon.svelte';
	import BookmarkIcon from '$lib/ui/Icons/BookmarkIcon.svelte';
	import CloseIcon from '$lib/ui/Icons/CloseIcon.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import Prompt from '$lib/ui/Prompt.svelte';
	import Recipe from '$lib/ui/Recipe.svelte';
	import { getContext, onDestroy } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { slide } from 'svelte/transition';
	import { networkStore } from '$lib/stores/network';
	import { deriveAICapability } from '$lib/utils/capabilities';
	import type { ViewState } from '$lib/types.js';
	import { CloudService, SyncService } from '$lib/api/cloud';

	// const vp: any = getContext('viewport');

	let { data, form } = $props();

	let app = $state({
		status: 'loading' as ViewState,
		error: ''
	});

	let currentUserId = $state<string | undefined>(undefined);
	let cloudService: CloudService | undefined = $state(undefined);
	let syncService: SyncService | undefined = $state(undefined);
	
	// let userPreferences = $derived(data.session?.user?.user_metadata?.preferences || '');
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

	/** Recipe and suggestion identifiers from URL params */
	const sid = $derived(page.url.searchParams.get('sid'));
	const title = $derived(page.url.searchParams.get('title'));
	const description = $derived(page.url.searchParams.get('description'));
	const hasPrompt = $derived(!!sid && !!title && !!description);

	/** Load suggestion from Dexie first */
	let suggestionFromDb = $state<(RecipeSummary & Partial<FullRecipe>) | null>(null);
	let hasFullRecipeInDb = $derived(
		suggestionFromDb && 'ingredients' in suggestionFromDb && 'instructions' in suggestionFromDb
	);

	type RecipeQueryStore = Exclude<ReturnType<typeof createFullRecipeQuery>, null>;
	type RecipeResult = Parameters<
		Parameters<RecipeQueryStore['subscribe']>[0]
		>[0];

	let recipeQueryStore = $state<RecipeQueryStore | null>(null);
	let recipeQueryResult = $state<RecipeResult | null>(null);

	let recipeFromAI = $derived((recipeQueryResult?.data as unknown as FullRecipe) || null);
	
	// Use recipe from DB if available, otherwise use AI result
	let recipe = $derived(
		hasFullRecipeInDb && suggestionFromDb 
			? (suggestionFromDb as FullRecipe)
			: recipeFromAI
	);

	let savedSuggestion = $state<Partial<SavedRecipe> | null>(null);

	/**
	 * Load the suggestion from Dexie when sid changes.
	 * If it has a full recipe, we'll render from DB. Otherwise we'll call AI.
	 */
	$effect(() => {
		if (!sid) {
			suggestionFromDb = null;
			return;
		}

		const loadSuggestion = async () => {
			const suggestion = await db.suggestions.get(sid);
			if (suggestion) {
				suggestionFromDb = suggestion as RecipeSummary & Partial<FullRecipe>;
				// Mark as viewed by updating last_opened
				if (!suggestion.last_opened) {
					await db.suggestions.update(sid, { 
						last_opened: new Date().toISOString() 
					});
				}
			} else {
				suggestionFromDb = null;
			}
		};

		loadSuggestion();
	});

	/**
	 * Manage services for cloud and sync operations.
	 *
	 * This effect is triggered when the user is logged in or logged out.
	 * Use `$effect` with caution: updating the `cloudService` or `syncService` will trigger
	 * a re-render, which will cause a loop.
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

	/**
	 * Request the full recipe from the AI API.
	 * Only calls AI if the suggestion doesn't already have the full recipe in Dexie.
	 *
	 * This effect is triggered when the title and description are set.
	 * Use `$effect` with caution: updating the `recipeQueryStore` or `recipeQueryResult` will trigger
	 * a re-render, which will cause a loop.
	 */
	$effect(() => {
		// If we already have the full recipe in DB, skip AI request
		if (hasFullRecipeInDb) {
			recipeQueryStore = null;
			recipeQueryResult = null;
			app.status = 'idle';
			return;
		}

		const currentTitle = title ? sanitizePromptInput(encodeURIComponent(title)) : null;
		const currentDescription = description ? sanitizePromptInput(encodeURIComponent(description)) : null;
		if (!currentTitle || !currentDescription || !canUseAI) {
			recipeQueryStore = null;
			recipeQueryResult = null;
			return;
		}

		const store = createFullRecipeQuery({
			title: currentTitle,
			description: currentDescription
		});
		if (!store) {
			recipeQueryStore = null;
			recipeQueryResult = null;
			return;
		}

		recipeQueryStore = store;

		const unsubscribe = store.subscribe((value) => {
			recipeQueryResult = value;
			app.status = 'idle';
		});

		return () => {
			unsubscribe();
			recipeQueryStore = null;
			recipeQueryResult = null;
		};
	});

	/**
	 * Start timeout to save full recipe to suggestions after 10 seconds
	 * Only saves if we got a recipe from AI (not from DB)
	 */
	$effect(() => {
		if (recipeFromAI && !hasFullRecipeInDb && sid && !savedSuggestion) {
			// Clear any existing timeout
			if (saveTimeout) {
				clearTimeout(saveTimeout);
			}

			// Start new 10-second timeout
			saveTimeout = window.setTimeout(() => {
				saveFullRecipeToSuggestions();
			}, 10 * 1000);
		}

		// Cleanup timeout on unmount
		return () => {
			if (saveTimeout) {
				clearTimeout(saveTimeout);
				saveTimeout = null;
			}
		};
	});

	let overriddenRecipe = $state<FullRecipe | null>(null);
	// let fullRecipe = $derived(overriddenRecipe ?? recipeFromQuery ?? null);
	let hasUnsavedChanges = $derived(Boolean(overriddenRecipe));

	// Responsible for passing the recipe to the FormData
	let recipeJson = $derived.by(() => (recipe ? JSON.stringify(recipe) : ''));

	// let promptInput = $state<string>();

	// let promptType = $state<PromptContext>();

	let promptRef = $state<HTMLElement>();

	let promptHeight = $derived(promptRef?.clientHeight);

	// let conversationMsg = $state<string>();

	// let lastFormMessage: string | undefined = undefined;

	// Timeout for saving full recipe to suggestions after 2 minutes
	let saveTimeout: number | null = null;

	function goBack() {
		window.history.back();
	}

	/**
	 * Save full recipe to suggestions table - updates the existing suggestion row
	 * instead of creating a new one
	 */
	async function saveFullRecipeToSuggestions() {
		if (!recipe || !sid) return;

		try {
			// Update the existing suggestion row with the full recipe data
			await db.suggestions.update(sid, {
				...recipe,
				last_opened: new Date().toISOString()
			});
			savedSuggestion = { ...recipe, id: sid };
		} catch (error) {
			console.error('Failed to save full recipe to suggestions:', error);
		}
	}

	/**
	 * Save to the User's recipe book
	 */
	async function saveRecipe() {
		if (!recipe) return;
		app.status = 'loading';

		let candidate: SavedRecipe | undefined = undefined;
		let syncError = false;

		if (hasCloudStorageAccess && cloudService) {
			try {
				candidate = await cloudService.uploadLocalRecipe(recipe);
				await db.recipes.put(candidate);
				toast.success('Recipe saved');
				goto(`/recipes/${candidate.id}`, { replaceState: true });
			} catch (err) {
				console.error('Cloud save failed; continuing locally', err);
				syncError = true;

				candidate = createSavedRecipe(recipe, err instanceof Error ? err.message : 'Unknown sync error');
				await db.recipes.put(candidate);
				toast.info('Recipe saved locally but failed to sync to cloud');
			} finally {
				app.status = 'idle';
			}
		} else {
			candidate = createSavedRecipe(recipe);
			await db.recipes.put(candidate);
			toast.success('Recipe saved');
			goto(`/recipes/${candidate.id}`, { replaceState: true });
		}

	}

	function createSavedRecipe(recipe: FullRecipe, error?: string): SavedRecipe {
		const now = new Date().toISOString();
		return {
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
		};
	}

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

	onDestroy(() => {
		if (saveTimeout) clearTimeout(saveTimeout);
	});

	// beforeNavigate(({ cancel }) => {
	// 	if (hasUnsavedChanges) {
	// 		const shouldLeave = confirm(
	// 			'You have unsaved changes. Are you sure you want to leave this page?'
	// 		);
	// 		if (!shouldLeave) {
	// 			cancel();
	// 		}
	// 	}
	// });
</script>

<div
	class="grid h-screen"
	style:place-content={recipeQueryResult?.isSuccess ? 'start stretch' : 'center'}
	style:padding-bottom={`calc(${promptHeight}px + 1.5rem)`}
>
	{#if !canUseAI}
		<div
			class="mb-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100"
		>
			{aiRestrictionMessage}
		</div>
	{:else if recipeQueryResult?.isError}
		<div class="mx-auto grid h-max w-full max-w-3xl place-content-center">
			<h1 class="display-medium my-8">Ah donkey-spittle! There was a problem.</h1>
			<p class="flex items-center gap-3">
				A recipe matching the provided title could not be found.
			</p>
		</div>
	{:else if recipeQueryResult?.data && recipe}
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
						{#if savedSuggestion}
							<div class="grid h-10 place-content-center">
								<span class="tag subtle label-small uppercase">Viewed</span>
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
				<Recipe recipe={recipe} />
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
	{:else}
		<ProgressSpinner size="lg" />
	{/if}
</div>
