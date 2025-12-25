<script lang="ts">
	// import { Button as BitsButton } from 'bits-ui';
	// import { Tooltip } from "bits-ui";
	import { getContext, onDestroy } from 'svelte';
	// import { slide } from 'svelte/transition';
	// import SvelteMarkdown from '@humanspeak/svelte-markdown';
	import { toast } from 'svelte-sonner';
	// import { v4 as uuid } from 'uuid';

	// import Tooltip from '$lib/ui/Tooltip.svelte';

	// import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import { CloudService, SyncService } from '$lib/api/cloud';
	import type { SavedRecipe } from '$lib/api/recipe';
	import { db } from '$lib/db';
	import { singleRecipeStore } from '$lib/stores/recipes';
	import type { PromptContext, ViewState } from '$lib/types';
	import { AppBar } from '$lib/ui/AppBar';
	// import Button from '$lib/ui/Button/Button.svelte';
	import EditableRecipe from '$lib/ui/EditableRecipe.svelte';
	// import CloseIcon from '$lib/ui/Icons/CloseIcon.svelte';
	import CloudBackupIcon from '$lib/ui/Icons/CloudBackupIcon.svelte';
	import FavoriteIcon from '$lib/ui/Icons/FavoriteIcon.svelte';
	import FavoriteFilledIcon from '$lib/ui/Icons/FavoriteFilledIcon.svelte';
	// import LockIcon from '$lib/ui/Icons/LockIcon.svelte';
	// import UnlockIcon from '$lib/ui/Icons/UnlockIcon.svelte';
	import PxlIconButton from '$lib/ui/PxlIconButton.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	// import Prompt from '$lib/ui/Prompt.svelte';
	import TrashIcon from '$lib/ui/Icons/TrashIcon.svelte';
	// import Recipe from '$lib/ui/Recipe.svelte';
	import { networkStore } from '$lib/stores/network';
	import { deriveAICapability } from '$lib/utils/capabilities';

	const vp: any = getContext('viewport');

	const markAsOpenedDelay = 5 * 60 * 1000;

	let { data, form } = $props();

	let cloudService: CloudService | undefined = $state(undefined);
	let syncService: SyncService | undefined = $state(undefined);

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

	let hasCloudStorageAccess = $derived(data.permissions?.cloudSync.allowed ?? false);
	// let hasAIAssistanceAccess = $derived(data.permissions?.aiAssistedRecipe.allowed ?? false);

	let path = $derived(page.params.id as string);

	let isShared = $derived(path.startsWith('shared/'));
	let id = $derived(isShared ? path.split('/')[1] : path);

	// let promptInput = $state<string>();

	// let promptType = $state<PromptContext>();

	// let conversationMsg = $state<string>();

	let app = $state({
		view: 'loading' as ViewState,
		error: ''
	});

	let recipeStore = $derived.by(() => {
		if (!id) return undefined;

		if (isShared) {
			throw new Error('Shared recipes not yet supported');
		} else {
			return singleRecipeStore(id);
		}
	});

	/** The current recipe from the store */
	let recipe = $derived<SavedRecipe | undefined>($recipeStore?.data ?? undefined);

	// Responsible for passing the recipe to the FormData
	let recipeJson = $derived(recipe ? JSON.stringify(recipe) : '');

	// Timer used to update the recipe's last_opened after a short delay
	// let openedTimer: ReturnType<typeof setTimeout> | null = null;
	let openedTimer: number | null = null;

	// Waiting for a response to an OpenAI request
	let waiting = $state(false);

	// let left = $derived.by(() => {
	// 	if (vp.device === 'mobile') return '0';
	// 	return vp.nav === 'expanded' ? 'calc(18rem + 1px)' : 'calc(3.5rem + 1px)';
	// });

	let promptRef = $state<HTMLElement>();

	let promptHeight = $derived(promptRef?.clientHeight);

	let lastFormMessage: string | undefined = undefined;

	let isLocked = $state(true);

	/**
	 * Update the recipe's last_opened timestamp and save it to the cloud
	 */
	$effect(() => {
		if (recipe) {
			app.view = 'idle';

			runMigration()

			if (openedTimer) {
				clearTimeout(openedTimer);
				openedTimer = null;
			}
			openedTimer = window.setTimeout(async () => {
				try {
					const ts = new Date().toISOString();
					if (hasCloudStorageAccess && syncService) {
						recipe = { ...recipe, last_opened: ts } as SavedRecipe;
						// TODO: Remove this once test data has been updated
						if ((recipe as unknown as any).total_time) {
							delete (recipe as unknown as any).total_time;
						}
						await syncService.uploadRecipeAndSyncLocal(recipe!);
					} else {
						await db.recipes.update(id, { last_opened: ts });
					}
				} catch (err) {
					console.error('Error updating last_opened:', err);
				} finally {
					openedTimer = null;
				}
			}, markAsOpenedDelay);
		}
	});

	// async function loadRecipe(id: string): Promise<SavedRecipe> {
	// 	if (isShared) {
	// 		throw new Error("Shared recipes not yet supported");
	// 	} else {
	// 		// return getSavedRecipe(id);
	// 		const r = await getSavedRecipe(id);
	// 		recipe = r;

	// 		// Clear any existing timer then set a new one to update last_opened
	// 		if (openedTimer) {
	// 			clearTimeout(openedTimer);
	// 			openedTimer = null;
	// 		}
	// 		openedTimer = window.setTimeout(async () => {
	// 			try {
	// 				const ts = new Date().toISOString();
	// 				await db.recipes.update(id, { last_opened: ts });
	// 				if (recipe && recipe.id === id) {
	// 					recipe = { ...recipe, last_opened: ts } as SavedRecipe;
	// 				}
	// 			} catch (err) {
	// 				console.error('Error updating last_opened:', err);
	// 			} finally {
	// 				openedTimer = null;
	// 			}
	// 		}, markAsOpenedDelay);
	// 		return r;
	// 	}
	// 	// if (isShared) {
	// 	// 	try {
	// 	// 		const res = await fetch(`/api/share/${id}`);
	// 	// 		if (!res.ok) throw new Error(await res.text());
				
	// 	// 		const data = await res.json();
	// 	// 		console.log('remote', data);
				
	// 	// 		if (data.recipe) {
	// 	// 			recipe = data.recipe;
	// 	// 			app.view = 'idle';
	// 	// 		} else {
	// 	// 			app.error = data.error || 'Recipe not found or unavailable.';
	// 	// 			app.view = 'error';
	// 	// 		}
	// 	// 	} catch (err) {
	// 	// 		console.log(err);
				
	// 	// 		app.error = 'Recipe not found or unavailable';
	// 	// 		app.view = 'error';
	// 	// 	}
	// 	// } else {
	// 	// 	const localRecipe = await getSavedRecipe(id);
	// 	// 	console.log('local', localRecipe);
			
	// 	// 	if (localRecipe) {
	// 	// 		recipe = localRecipe;
	// 	// 		app.view = 'idle';
	// 	// 		db.recipes.update(id, { last_opened: Date.now() });
	// 	// 	} else {
	// 	// 		app.error = 'A recipe matching the provided ID could not be found.';
	// 	// 		app.view = 'error';
	// 	// 	}
	// 	// }
	// }


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
	
	/**
	 * Manage services for cloud and sync operations
	 */
	$effect(() => {
		if (data.user?.id) {
			cloudService = new CloudService(data.supabase, data.user.id);
			syncService = new SyncService(cloudService);
		} else if (cloudService || syncService) {
			cloudService = undefined;
			syncService = undefined;
		}
	});

	onDestroy(() => {
		if (openedTimer) clearTimeout(openedTimer);
	});
	
	// React to user prompts
	// $effect(() => {
	// 	if (form && form.error === undefined) {
	// 		if (form.message === lastFormMessage) return;

	// 		const { type, message } = form;
	// 		promptType = type;
	// 		if (typeof message !== 'string') {
	// 			console.warn('Unexpected non-string form message payload', message);
	// 			return;
	// 		}

	// 		lastFormMessage = message;
	// 		waiting = false;

	// 		if (type === 'assistance') {
	// 			conversationMsg = message;
	// 		} else {
	// 			// clone the snapshot to avoid "DataCloneError" in `saveModifiedRecipe()`
	// 			const originalRecipe = structuredClone($state.snapshot(recipe)) as SavedRecipe;

	// 			try {
	// 				recipe = JSON.parse(message) as SavedRecipe;
	// 				toast.dismiss();
	// 				toast.success(`"${recipe.title}" has unsaved changes`, {
	// 					duration: Number.POSITIVE_INFINITY,
	// 					action: {
	// 						label: 'Save changes',
	// 						onClick: () => saveModifiedRecipe(originalRecipe)
	// 					}
	// 				});
	// 			} catch (err) {
	// 				console.error(err);
	// 				toast.error('There was a problem parsing the recipe JSON');
	// 			}
	// 		}
	// 	} else if (form && form.error) {
	// 		waiting = false;
	// 		console.error(form.error);
	// 		toast.error(`${form.error}`);
	// 	}
	// });

	/**
	 * Toggle the recipe's `is_favorite` status
	 */
	function toggleFavorite() {
		if (!recipe) return;
		recipe.is_favorite = !recipe.is_favorite;
		saveChanges(true);
	}

	/**
	 * Save the modified recipe to the database
	 * @param recipe - The recipe to save
	 */
	// async function saveModifiedRecipe(recipe: SavedRecipe) {
	// 	console.log('saveModifiedRecipe', recipe);
	// 	const now = new Date().toISOString();
	// 	recipe.updated_at = now;

	// 	db.recipes.update(recipe.id, recipe)
	// 		.then(async () => {
	// 			await saveRecipeToCloud(recipe);
	// 			toast.success('Recipe saved');
	// 		})
	// 		.catch((err) => {
	// 			toast.error('There was a problem saving the recipe');
	// 			console.error(err);
	// 		});
	// }

	/**
	 * Save the modified recipe as a new version. Currently unused.
	 * 
	 * @param original - The original recipe
	 * @param updated - The updated recipe
	 * @returns The new recipe
	 * 
	 * @todo This will require keeping a recipe for each version and I'm not sure if it's worth it
	 */
	// async function saveModifiedRecipeAsNew(original: SavedRecipe, updated: SavedRecipe) {
	// 	await db.recipes.update(original.id, { is_current: false });

	// 	const now = new Date().toISOString();
	// 	const newRecipe: SavedRecipe = {
	// 		...updated,
	// 		id: uuid(),
	// 		parent_id: original.parent_id ?? original.id,
	// 		version: original.version + 1,
	// 		is_current: true,
	// 		created_at: now,
	// 		last_opened: now,
	// 	};

	// 	await db.recipes.put(newRecipe);
	// 	return newRecipe;
	// }

	/**
	 * Save recipe changes
	 * 
	 * If available, upload the recipe to the cloud and sync the local database.
	 * If unavailable or the upload fails, save the recipe locally.
	 * 
	 * @param disableToast - If true, successful toast notifications will not be shown
	 */
	async function saveChanges(disableToast: boolean = false) {
		if (!recipe) return;
		app.view = 'loading';

		let candidate: SavedRecipe | undefined = undefined;
		let syncError = false;

		if (hasCloudStorageAccess && cloudService) {
			try {
				candidate = await cloudService.uploadLocalRecipe(recipe);
			} catch (err) {
				console.error('Cloud save failed; continuing locally', err);
				syncError = true;
				candidate = {...recipe, updated_at: new Date().toISOString()};
			}
		} else {
			candidate = {...recipe, updated_at: new Date().toISOString()};
		}

		try {
			await db.recipes.put(candidate);
			if (syncError) {
				toast.info('Recipe saved locally but failed to sync to cloud');
			} else {
				if (!disableToast) {
					toast.success('Recipe saved');
				}
			}
		} catch (err) {
			console.error('Local save failed', err);
			toast.error('There was a problem saving the recipe');
		} finally {
			app.view = 'idle';
		}
	}

	/**
	 * Upload a recipe to the cloud. SyncService will automatically update the local database.
	 */
	async function saveRecipeToCloud(recipe: SavedRecipe): Promise<void> {
		if (hasCloudStorageAccess && syncService) {
			try {
				await syncService.uploadRecipeAndSyncLocal(recipe);
			} catch (error) {
				toast.error('Sync failed');
				console.error(error);
			}
		}
	}

	/**
	 * Delete a recipe from the database and redirect to the recipes page
	 * @param id - The id of the recipe to delete
	 */
	async function deleteRecipe(id: string) {
		if (!id || !recipe || (recipe.id !== id)) return;

		let candidate: SavedRecipe | undefined = undefined;
		try {
			candidate = {...recipe, deleted_at: new Date().toISOString()};
			if (hasCloudStorageAccess && cloudService) {
				try {
					candidate = await cloudService.uploadLocalRecipe(candidate);
				} catch (err) {
					// Continue with local delete even if cloud upload fails
					console.error('Cloud delete failed; continuing locally', err);
				}
			}
			await db.recipes.put(candidate);
			toast.success(`Recipe deleted`);
			goto('/recipes', { replaceState: true });
		} catch (err) {
			toast.error('There was a problem deleting the recipe');
			console.error(err);
		}
	}

	/**
	 * Check if the recipe uses old `time` object. Run the migration if necessary.
	*/
	function runMigration() {
		if (!recipe) {
			return;
		} else if (recipe.prep_time && recipe.cook_time) {
			if (recipe.prep_time.length && typeof recipe.prep_time !== 'string' && recipe.cook_time.length && typeof recipe.cook_time !== 'string') {
				return;
			}
		}
		console.log('runMigration', recipe.prep_time, recipe.cook_time);

		// Convert recipes that used number values for prep and cook times to string arrays
		if (typeof recipe.prep_time === 'number') {
			recipe.prep_time = [(recipe.prep_time as number).toString()];
		}
		if (typeof recipe.cook_time === 'number') {
			recipe.cook_time = [(recipe.cook_time as number).toString()];
		}

		if (recipe?.time && (recipe.prep_time === undefined || recipe.cook_time === undefined)) {
			recipe.prep_time = recipe.time.prep ? convertAiTime(recipe.time.prep) : ['0'];
			recipe.cook_time = recipe.time.cook ? convertAiTime(recipe.time.cook) : ['0'];
			recipe.time = undefined;
		}
		
		console.log('prep_time', recipe.prep_time);
		console.log('cook_time', recipe.cook_time);
		
		saveChanges(true);
	}

	/**
	 * Convert a AI generated time string to minutes
	 * 
	 * Example: "10-15 minutes" -> ["10", "15"]
	 * Example: "10 minutes" -> ["10"]
	 * Example: "10 hours" -> ["600"]
	 * Example: "10 hours 10 minutes" -> ["610"]
	 * Example: "10 minutes to 1 hour 10 minutes" -> ["10", "70"]
	 * Example: "0h 10m" -> ["10"]
	 * Example: "1:25" -> ["85"]
	 * 
	 * The original AI generated recipes lacked a definitive structure for time related fields.
	 * This function parses the string and returns the time in minutes.
	 * 
	 * @param value - The time string to convert
	 * @returns The time in minutes. Tuples are returned for ranges.
	 */
	function convertAiTime(value: string | undefined): string[] {
		if (!value) return ['0'];

		console.log('convertAiTime', value);
		const ALPHA_RX = /^[a-zA-Z]+$/;
		// const DIGITS_RX = /^[0-9]+$/;
		const HOURS_RX = /(\d+)\s?h|(\d+):/;
		const MINUTES_RX = /(\d+)\s?m|\d+:(\d+)/;

		let isRange = false;
		let isHours = false;
		let isMinutes = false;

		let times: string[] = [];

		if (value.includes('-') || value.includes('to')) {
			isRange = true;
		}
		if (value.includes('hours')) {
			isHours = true;
		}
		if (value.includes('minutes')) {
			isMinutes = true;
		}

		if (isRange) {
			const splitOn = value.includes('-') ? '-' : 'to';
			value.split(splitOn).forEach(time => {
				// If the value does not contain any alphabetic characters we can't determine the unit of
				// measure, so we'll mark it with a `!` and return after checking the other value.
				if (!ALPHA_RX.test(time)) {
					times.push(`!${time}`);
				} else {
					let hours = 0;
					let minutes = 0;
					if (isHours) {
						// Convert hours to minutes
						hours = parseInt(HOURS_RX.exec(time)?.[1] ?? '0');
					}
					if (isMinutes) {
						// get minutes
						minutes = parseInt(MINUTES_RX.exec(time)?.[1] ?? '0');
					}
					times.push((hours * 60 + minutes).toString());
				}
			});

			// Check back on the first value to see if it was flagged.
			if (times[0].startsWith('!')) {
				// get the value without the `!`
				const verified = times[0].substring(1);
				// If the second value is greater than 59, we can assume it's in hours and convert it to minutes.
				if (parseInt(times[1]) > 59) {
					times[0] = `${parseInt(verified) * 60}`;
				}
			}
		} else {
			let hours = 0;
			let minutes = 0;
			if (isHours) {
				hours = parseInt(HOURS_RX.exec(value)?.[1] ?? '0');
			}
			if (isMinutes) {
				minutes = parseInt(MINUTES_RX.exec(value)?.[1] ?? '0');
			}
			times.push((hours * 60 + minutes).toString());
		}

		console.log('convertAiTime', value, times);
		return times;
	}
</script>

<PageHeader>
	<AppBar.Root>
		<AppBar.Text primary={recipe?.title || ''} />
		<AppBar.End>
			{#if recipe }
				{#if app.view === 'loading'}
					<div class="grid place-content-center w-10 h-10">
						<ProgressSpinner size="xs" />
					</div>
				{/if}
				{#if hasCloudStorageAccess && syncService && network.online}
					<PxlIconButton aria-label="Sync recipe" tooltip="Sync recipe" onclick={() => saveRecipeToCloud(recipe!)}>
						<CloudBackupIcon size="xs" />
					</PxlIconButton>
				{/if}
				<PxlIconButton
					aria-label={recipe?.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
					tooltip={recipe?.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
					onclick={toggleFavorite}
				>
					{#if recipe?.is_favorite}
						<FavoriteFilledIcon size="xs" />
					{:else}
						<FavoriteIcon size="xs" />
					{/if}
				</PxlIconButton>
				<!-- <PxlIconButton
					aria-label={isLocked ? 'Unlock recipe' : 'Lock recipe'}
					tooltip={isLocked ? 'Unlock to make changes' : 'Lock to prevent changes'}
					onclick={() => { isLocked = !isLocked }}
				>
					{#if isLocked}
						<LockIcon size="xs" />
					{:else}
						<UnlockIcon size="xs" />
					{/if}
				</PxlIconButton> -->
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
	class="mx-auto max-w-5xl px-4 lg:px-8 py-8"
	style:padding-bottom={`calc(${promptHeight}px + 1.5rem)`}
>
	{#if $recipeStore?.loading}
		<div class="absolute inset-0 grid place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{:else if $recipeStore?.error}
		<div class="mx-auto grid w-full max-w-3xl place-content-center gap-6">
			<h1 class="fluid-heading-05">Ah donkey-spittle! There was a problem.</h1>
			<p class="flex items-center gap-3">
				<span class="fluid-heading-03">{$recipeStore.error.name}</span><span>|</span><span>{$recipeStore.error?.message}</span>
			</p>
		</div>
	{:else if recipe}
		<EditableRecipe {recipe} locked={isLocked} />
		{#if canUseAI}
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
			</div> -->
		{:else if aiRestrictionMessage}
			<div
				class="mt-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100"
			>
				{aiRestrictionMessage()}
			</div>
		{/if}
	{/if}
</article>
