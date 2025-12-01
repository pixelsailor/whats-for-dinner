<script lang="ts">
	import { Button as BitsButton } from 'bits-ui';
	// import { Tooltip } from "bits-ui";
	import { getContext, onDestroy, onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import SvelteMarkdown from '@humanspeak/svelte-markdown';
	import { toast } from 'svelte-sonner';
	import { v4 as uuid } from 'uuid';

	import Tooltip from '$lib/ui/Tooltip.svelte';

	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { db } from '$lib/db';
	import { getSavedRecipe } from '$lib/stores/recipes';
	import type { PromptContext, SavedRecipe, ViewState } from '$lib/types';
	import Button from '$lib/ui/Button/Button.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import { AppBar } from '$lib/ui/AppBar';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import Prompt from '$lib/ui/Prompt.svelte';
	import CloseIcon from '$lib/ui/Icons/CloseIcon.svelte';
	// import Recipe from '$lib/ui/Recipe.svelte';
	import EditableRecipe from '$lib/ui/EditableRecipe.svelte';
	import { networkStore } from '$lib/stores/network';
	import { deriveAICapability } from '$lib/utils/capabilities';
	import LockIcon from '$lib/ui/Icons/LockIcon.svelte';
	import UnlockIcon from '$lib/ui/Icons/UnlockIcon.svelte';
	import PxlIconButton from '$lib/ui/PxlIconButton.svelte';
	import FavoriteFilledIcon from '$lib/ui/Icons/FavoriteFilledIcon.svelte';
	import FavoriteIcon from '$lib/ui/Icons/FavoriteIcon.svelte';
	import TrashIcon from '$lib/ui/Icons/TrashIcon.svelte';
	import { goto } from '$app/navigation';

	const vp: any = getContext('viewport');

	const markAsOpenedDelay = 2 * 60 * 1000;

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
	let aiRestrictionMessage = $derived(() => {
		switch (aiCapability.reason) {
			case 'offline':
				return 'You are offline. Reconnect to ask follow-up questions.';
			case 'disabled':
				return 'AI recipe assistance is unavailable in this build.';
			case 'unauthenticated':
				return 'Log in to ask for recipe adjustments.';
			case 'unauthorized':
				return 'Your account does not include AI recipe assistance.';
			default:
				return '';
		}
	});

	let path = $derived(page.params.id as string);

	let isShared = $derived(path.startsWith('shared/'));
	let id = $derived(isShared ? path.split('/')[1] : path);

	let promptInput = $state<string>();

	let promptType = $state<PromptContext>();

	let conversationMsg = $state<string>();

	let app = $state({
		view: 'loading' as ViewState,
		error: ''
	});

	let recipe = $state<SavedRecipe>();

	// Responsible for passing the recipe to the FormData
	let recipeJson = $derived(recipe ? JSON.stringify(recipe) : '');

	// Timer used to update the recipe's last_opened after a short delay
	// let openedTimer: ReturnType<typeof setTimeout> | null = null;
	let openedTimer: number | null = null;

	// Waiting for a response to an OpenAI request
	let waiting = $state(false);

	let left = $derived.by(() => {
		if (vp.device === 'mobile') return '0';
		return vp.nav === 'expanded' ? 'calc(18rem + 1px)' : 'calc(3.5rem + 1px)';
	});

	let promptRef = $state<HTMLElement>();

	let promptHeight = $derived(promptRef?.clientHeight);

	let lastFormMessage: string | undefined = undefined;

	let isLocked = $state(true);

	async function loadRecipe(id: string): Promise<SavedRecipe> {
		if (isShared) {
			throw new Error("Shared recipes not yet supported");
		} else {
			// return getSavedRecipe(id);
			const r = await getSavedRecipe(id);
			recipe = r;

			// Clear any existing timer then set a new one to update last_opened
			if (openedTimer) {
				clearTimeout(openedTimer);
				openedTimer = null;
			}
			openedTimer = window.setTimeout(async () => {
				try {
					const ts = Date.now();
					await db.recipes.update(id, { last_opened: ts });
					if (recipe && recipe.id === id) {
						recipe = { ...recipe, last_opened: ts } as SavedRecipe;
					}
				} catch (err) {
					console.error('Error updating last_opened:', err);
				} finally {
					openedTimer = null;
				}
			}, markAsOpenedDelay);
			return r;
		}
		// if (isShared) {
		// 	try {
		// 		const res = await fetch(`/api/share/${id}`);
		// 		if (!res.ok) throw new Error(await res.text());
				
		// 		const data = await res.json();
		// 		console.log('remote', data);
				
		// 		if (data.recipe) {
		// 			recipe = data.recipe;
		// 			app.view = 'idle';
		// 		} else {
		// 			app.error = data.error || 'Recipe not found or unavailable.';
		// 			app.view = 'error';
		// 		}
		// 	} catch (err) {
		// 		console.log(err);
				
		// 		app.error = 'Recipe not found or unavailable';
		// 		app.view = 'error';
		// 	}
		// } else {
		// 	const localRecipe = await getSavedRecipe(id);
		// 	console.log('local', localRecipe);
			
		// 	if (localRecipe) {
		// 		recipe = localRecipe;
		// 		app.view = 'idle';
		// 		db.recipes.update(id, { last_opened: Date.now() });
		// 	} else {
		// 		app.error = 'A recipe matching the provided ID could not be found.';
		// 		app.view = 'error';
		// 	}
		// }
	}


// 	async function loadRecipe(id: string): Promise<SavedRecipe> {
// 		if (isShared) {
// 			throw new Error('Shared recipes not yet supported');
// 		} else {
// 			const r = await getSavedRecipe(id);
// 			recipe = r;
// 			// Clear any existing timer then set a new one to update last_opened
// 			if (openedTimer) {
// 				clearTimeout(openedTimer as unknown as number);
// 				openedTimer = null;
// 			}
// // 		app.error = 'A recipe matching the provided ID could not be found.';
// 			openedTimer = setTimeout(async () => {
// 				try {
// 					const ts = Date.now();
// 					await db.recipes.update(id, { last_opened: ts });
// 					if (recipe && recipe.id === id) {
// 						recipe = { ...recipe, last_opened: ts } as SavedRecipe;
// 					}
// 				} catch (err) {
// 					console.error('Error updating last_opened:', err);
// 				} finally {
// 					openedTimer = null;
// 				}
// 			}, 20000);
// // 		app.view = 'error';
// 			return r;
// 		}
// 	}
// 		// 	}
// 			onDestroy(() => {
// 				if (openedTimer) {
// 					clearTimeout(openedTimer as unknown as number);
// 					openedTimer = null;
// 				}
// 			});

	onDestroy(() => {
		if (openedTimer) clearTimeout(openedTimer);
	});
	
	$effect(() => {
		loadRecipe(id);
	});

	// React to user prompts
	$effect(() => {
		if (form && form.error === undefined) {
			if (form.message === lastFormMessage) return;

			const { type, message } = form;
			promptType = type;
			if (typeof message !== 'string') {
				console.warn('Unexpected non-string form message payload', message);
				return;
			}

			lastFormMessage = message;
			waiting = false;

			if (type === 'assistance') {
				conversationMsg = message;
			} else {
				// clone the snapshot to avoid "DataCloneError" in `saveModifiedRecipe()`
				const original = structuredClone($state.snapshot(recipe)) as SavedRecipe;

				try {
					recipe = JSON.parse(message) as SavedRecipe;
					toast.dismiss();
					toast.success(`"${recipe.title}" has unsaved changes`, {
						duration: Number.POSITIVE_INFINITY,
						action: {
							label: 'Save changes',
							onClick: () => saveModifiedRecipe(original, structuredClone($state.snapshot(recipe!)))
						}
					});
				} catch (err) {
					console.error(err);
					toast.error('There was a problem parsing the recipe JSON');
				}
			}
		} else if (form && form.error) {
			waiting = false;
			console.error(form.error);
			toast.error(`${form.error}`);
		}
	});

	function saveRecipeChanges() {
		console.log('saveRecipeChanges');
		
	}

	async function saveModifiedRecipe(original: SavedRecipe, updated: SavedRecipe) {
		await db.recipes.update(original.id, { is_current: false });

		const version = original.version + 1;
		const now = Date.now();
		const newRecipe: SavedRecipe = {
			...updated,
			id: uuid(),
			version,
			parent_id: original.parent_id ?? original.id,
			// archived: 0,
			// deleted_at: 0,
			is_current: true,
			created_at: now,
			last_opened: now
		};

		await db.recipes.put(newRecipe);
		return newRecipe;
	}

	/**
	 * Delete a recipe from the database and redirect to the recipes page
	 * @param id - The id of the recipe to delete
	 */
	async function deleteRecipe(id: string) {
		if (!id) return;
		try {
			await db.recipes.delete(id);
			toast.success(`Recipe deleted`);
		} catch (err) {
			toast.error('There was a problem deleting the recipe');
			console.error(err);
		} finally {
			goto('/recipes', { replaceState: true });
		}
	}
</script>

<PageHeader>
	<AppBar.Root>
		<AppBar.Text primary={recipe?.title || ''} />
		<AppBar.End>
			{#if recipe}
				<PxlIconButton
					aria-label={recipe?.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
					tooltip={recipe?.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
					onclick={() => {
						if (!recipe) return;
						recipe!.is_favorite = !recipe.is_favorite;
					}}
				>
					{#if recipe?.is_favorite}
						<FavoriteFilledIcon size="xs" />
					{:else}
						<FavoriteIcon size="xs" />
					{/if}
				</PxlIconButton>
				<PxlIconButton
					aria-label={isLocked ? 'Unlock recipe' : 'Lock recipe'}
					tooltip={isLocked ? 'Unlock to make changes' : 'Lock to prevent changes'}
					onclick={() => { isLocked = !isLocked }}
				>
					{#if isLocked}
						<LockIcon size="xs" />
					{:else}
						<UnlockIcon size="xs" />
					{/if}
				</PxlIconButton>
				<PxlIconButton
					aria-label="Delete recipe"
					tooltip="Delete recipe"
					onclick={() => { deleteRecipe(recipe!.id) }}
				>
					<TrashIcon size="xs" />
				</PxlIconButton>
			{/if}
		</AppBar.End>
	</AppBar.Root>
</PageHeader>

<article
	class="mx-auto max-w-5xl px-4 pt-24"
	style:padding-bottom={`calc(${promptHeight}px + 1.5rem)`}
>
	{#await loadRecipe(id)}
		<div class="absolute inset-0 grid place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{:then recipe}
		<!-- <Recipe {recipe} onBlur={saveRecipeChanges} /> -->
		<EditableRecipe {recipe} locked={isLocked} />
		{#if canUseAI}
			<div class="fixed right-0 bottom-0 px-4" style:left bind:this={promptRef}>
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
							waiting = true;
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
						<Button type="submit" label="Submit request" disabled={waiting || !promptInput?.trim()}
							>{waiting ? 'Thinking...' : 'Submit'}</Button
						>
					</form>
				</Prompt>
			</div>
		{:else if aiRestrictionMessage}
			<div
				class="mt-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100"
			>
				{aiRestrictionMessage()}
			</div>
		{/if}
	{/await}
	<!-- {#if app.view === 'loading'}
		<div class="absolute inset-0 grid place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{:else if app.view === 'idle' && recipe}
		<Recipe {recipe} />
		<div class="fixed right-0 bottom-0 px-4" style:left bind:this={promptRef}>
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
						waiting = true;
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
					<Button type="submit" label="Submit request" disabled={waiting || !promptInput?.trim()}
						>{waiting ? 'Thinking...' : 'Submit'}</Button
					>
				</form>
			</Prompt>
		</div>
	{:else}
		<div class="mx-auto grid h-max w-full max-w-3xl place-content-center">
			<h1 class="fluid-heading-05 my-8">Ah donkey-spittle! There was a problem.</h1>
			<p class="flex items-center gap-3">A recipe matching the provided ID could not be found.</p>
		</div>
	{/if} -->
</article>
