<script lang="ts">
	import { enhance } from '$app/forms';
	import { beforeNavigate, goto } from '$app/navigation';
	import { db } from '$lib/db';
	import { sanitizePromptInput } from '$lib/utils';
	import type { FullRecipe, OpenAiApiResponse, PromptContext } from '$lib/types.js';
	import { AppBar } from '$lib/ui/AppBar';
	import Button from '$lib/ui/Button/Button.svelte';
	import BackIcon from '$lib/ui/Icons/BackIcon.svelte';
	import BookmarkIcon from '$lib/ui/Icons/BookmarkIcon.svelte';
	import CloseIcon from '$lib/ui/Icons/CloseIcon.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import Prompt from '$lib/ui/Prompt.svelte';
	import Recipe from '$lib/ui/Recipe.svelte';
	import SvelteMarkdown from '@humanspeak/svelte-markdown';
	import { getContext, onDestroy } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { slide } from 'svelte/transition';
	import { v4 as uuid } from 'uuid';
	import { networkStore } from '$lib/stores/network';
	import { deriveAICapability } from '$lib/utils/capabilities';

	const vp: any = getContext('viewport');

	let { data, form } = $props();
	
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

	type RecipeRequestState = {
		data: OpenAiApiResponse<FullRecipe> | null;
		isPending: boolean;
		isError: boolean;
		error: string | null;
	};

	const initialRecipeState = (): RecipeRequestState => ({
		data: null,
		isPending: false,
		isError: false,
		error: null
	});

	const decodeParam = (value: string): string => {
		try {
			return decodeURIComponent(value);
		} catch {
			return value;
		}
	};

	let recipeQueryState = $state<RecipeRequestState>(initialRecipeState());

	let recipeFromQuery = $derived.by<FullRecipe | null>(() => {
		const payload = recipeQueryState.data?.data;
		return payload ? (payload[1] as FullRecipe) : null;
	});

	$effect(() => {
		const rawTitle = data.recipe.title;
		const rawDescription = data.recipe.description ?? '';

		if (!canUseAI) {
			recipeQueryState = initialRecipeState();
			return;
		}

		const sanitizedPrompt = sanitizePromptInput(decodeParam(rawTitle ?? ''));
		const sanitizedDesc = sanitizePromptInput(decodeParam(rawDescription));

		if (!sanitizedPrompt.length) {
			recipeQueryState = {
				data: null,
				isPending: false,
				isError: true,
				error: 'A recipe title is required.'
			};
			return;
		}

		const controller = new AbortController();

		recipeQueryState = {
			data: null,
			isPending: true,
			isError: false,
			error: null
		};

		const fetchRecipe = async () => {
			try {
				const response = await fetch('/api/recipes', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						action: 'detail',
						prompt: sanitizedPrompt,
						recipe: sanitizedDesc
					}),
					signal: controller.signal
				});

				const payload = (await response.json()) as OpenAiApiResponse<FullRecipe>;

				if (!response.ok) {
					throw new Error(payload?.error?.message ?? 'Failed to load recipe details.');
				}

				recipeQueryState = {
					data: payload,
					isPending: false,
					isError: false,
					error: null
				};
			} catch (error) {
				if (controller.signal.aborted) return;
				recipeQueryState = {
					data: null,
					isPending: false,
					isError: true,
					error:
						error instanceof Error
							? error.message
							: 'Unable to request recipe details right now.'
				};
			}
		};

		void fetchRecipe();

		return () => controller.abort();
	});

	let overriddenRecipe = $state<FullRecipe | null>(null);
	let fullRecipe = $derived(overriddenRecipe ?? recipeFromQuery ?? null);
	let hasUnsavedChanges = $derived(Boolean(overriddenRecipe));

	// Responsible for passing the recipe to the FormData
	let recipeJson = $derived.by(() => (fullRecipe ? JSON.stringify(fullRecipe) : ''));

	// Account for sidenav width and adjust accordingly
	// let left = $derived.by(() => {
	// 	if (vp.device === 'mobile') return '0';
	// 	return vp.nav === 'expanded' ? 'calc(18rem + 1px)' : 'calc(3.5rem + 1px)';
	// });

	let status = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');

	// True when a request is being processed
	let working = $state(false);

	let promptInput = $state<string>();

	let promptType = $state<PromptContext>();

	let promptRef = $state<HTMLElement>();

	let promptHeight = $derived(promptRef?.clientHeight);

	let conversationMsg = $state<string>();

	let lastFormMessage: string | undefined = undefined;

	// Timeout for saving full recipe to suggestions after 2 minutes
	let saveTimeout: number | null = null;

	function goBack() {
		window.history.back();
	}

	/**
	 * Save full recipe to suggestions table after 2 minutes
	 */
	async function saveFullRecipeToSuggestions() {
		if (!fullRecipe || !data.recipe.title) return;

		try {
			// Convert title to suggestion ID using same logic as saveSuggestions
			const suggestionId = data.recipe.title.toLowerCase().replaceAll(' ', '-');

			const safeRecipe = JSON.parse(JSON.stringify(fullRecipe)) as FullRecipe;

			await db.suggestions.update(suggestionId, {
				...safeRecipe,
				last_opened: Date.now()
			});
		} catch (error) {
			console.error('Failed to save full recipe to suggestions:', error);
		}
	}

	/**
	 * Save to the User's recipe book
	 */
	async function saveRecipe() {
		working = true;

		try {
			if (!fullRecipe) {
				toast.error('No recipe available to save');
				working = false;
				return;
			}

			const now = Date.now();
			const clonedRecipe: FullRecipe = JSON.parse(JSON.stringify(fullRecipe));
			const newRecipe = {
				...clonedRecipe,
				id: uuid(),
				created_at: now,
				last_opened: now,
				version: 1,
				is_current: true,
				is_favorite: false
			};

			const recipeId = await db.recipes.put(newRecipe);
			
			status = 'saved';
			goto(`/recipes/${recipeId}`, { replaceState: true });
		} catch (err) {
			console.error('Save failed', err);
			status = 'error';
			working = false;
			toast.error('Save failed');
		}
	}

	// Handle prompt responses
	$effect(() => {
		if (form && form.error === undefined) {
			if (form.message === lastFormMessage) return;

			const { type, message } = form;
			if (typeof message !== 'string') {
				console.error('Unexpected AI payload', message);
				toast.error('There was a problem parsing the recipe response');
				working = false;
				return;
			}

			const messageText = message;
			promptType = type;
			lastFormMessage = messageText;
			working = false;

			if (type === 'assistance') {
				conversationMsg = messageText;
			} else {
				try {
					overriddenRecipe = JSON.parse(messageText) as FullRecipe;
					toast.success(`"${overriddenRecipe.title}" updated`);
				} catch (err) {
					console.error(err);
					toast.error('There was a problem parsing the recipe JSON');
				}
			}
		} else if (form && form.error) {
			working = false;
			console.error(form.error);
			toast.error(`${form.error}`);
		}
	});

	// Start timeout to save full recipe to suggestions after 2 minutes
	$effect(() => {
		if (fullRecipe && data.recipe.title) {
			// Clear any existing timeout
			if (saveTimeout) {
				clearTimeout(saveTimeout);
			}

			// Start new 2-minute timeout
			saveTimeout = window.setTimeout(() => {
				saveFullRecipeToSuggestions();
			}, 2 * 60 * 1000); // 2 minutes
		}

		// Cleanup timeout on unmount
		return () => {
			if (saveTimeout) {
				clearTimeout(saveTimeout);
				saveTimeout = null;
			}
		};
	});

	onDestroy(() => {
		if (saveTimeout) clearTimeout(saveTimeout);
	});

	beforeNavigate(({ cancel }) => {
		if (hasUnsavedChanges) {
			const shouldLeave = confirm(
				'You have unsaved changes. Are you sure you want to leave this page?'
			);
			if (!shouldLeave) {
				cancel();
			}
		}
	});
</script>

<PageHeader>
	<AppBar.Root>
		{#if recipeQueryState?.data}
			<Button onClick={goBack} label="Go back to recipe suggetions" size="sm">
				<BackIcon size="xs" />
				Back to suggestions
			</Button>
		{:else if !canUseAI}
			<AppBar.Text primary="AI unavailable" />
		{:else}
			<AppBar.Text primary="Checking the pantry..." />
		{/if}
		{#if recipeQueryState?.data}
			<AppBar.End>
				<Button onClick={saveRecipe} label="Save recipe" disabled={!canUseAI}>
					<BookmarkIcon size="xs" />
					Save recipe
				</Button>
			</AppBar.End>
		{/if}
	</AppBar.Root>
</PageHeader>
<article
	class="mx-auto max-w-5xl px-4 pt-24"
	style:padding-bottom={`calc(${promptHeight}px + 1.5rem)`}
>
	{#if !canUseAI}
		<div class="mx-auto grid h-max w-full max-w-3xl place-content-center text-center">
			<h1 class="fluid-heading-05 my-8">AI recipe details unavailable</h1>
			<p>{aiRestrictionMessage}</p>
		</div>
	{:else if recipeQueryState?.isError}
		<div class="mx-auto grid h-max w-full max-w-3xl place-content-center">
			<h1 class="fluid-heading-05 my-8">Ah donkey-spittle! There was a problem.</h1>
			<p class="flex items-center gap-3">
				A recipe matching the provided title could not be found.
			</p>
		</div>
	{:else if recipeQueryState?.data && fullRecipe}
		<Recipe recipe={fullRecipe} />
		<Button onClick={saveRecipe} label="Save to My Recipes" disabled={working} size="sm">
			<BookmarkIcon size="xs" />
			Save to My Recipes
		</Button>
		<div class="fixed right-0 bottom-0 px-4" bind:this={promptRef}>
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
		</div>
	{:else}
		<div class="absolute inset-0 grid place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{/if}
</article>
