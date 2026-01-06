<script lang="ts">
	import { getLocalTimeZone, parseDate, today } from '@internationalized/date';
	// import { DatePicker } from 'bits-ui';
	import { getContext, onDestroy, untrack } from 'svelte';
	import { toast } from 'svelte-sonner';

	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	import { CloudService, SyncService } from '$lib/api/cloud';
	import type { SavedRecipe } from '$lib/api/recipe';
	import { db } from '$lib/db';
	import { singleRecipeStore } from '$lib/stores/recipes';
	import type { PromptContext, ViewState } from '$lib/types';

	import { AppBar } from '$lib/ui/AppBar';
	import EditableRecipe from '$lib/ui/EditableRecipe.svelte';
	// import CloseIcon from '$lib/ui/Icons/CloseIcon.svelte';
	// import CloudBackupIcon from '$lib/ui/Icons/CloudBackupIcon.svelte';
	import FavoriteIcon from '$lib/ui/icons/FavoriteIcon.svelte';
	import FavoriteFilledIcon from '$lib/ui/icons/FavoriteFilledIcon.svelte';
	// import LockIcon from '$lib/ui/Icons/LockIcon.svelte';
	// import UnlockIcon from '$lib/ui/Icons/UnlockIcon.svelte';
	import PxlIconButton from '$lib/ui/PxlIconButton.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	// import Prompt from '$lib/ui/Prompt.svelte';
	import TrashIcon from '$lib/ui/icons/TrashIcon.svelte';
	// import Recipe from '$lib/ui/Recipe.svelte';
	import { networkStore } from '$lib/stores/network';
	import { deriveAICapability } from '$lib/utils/capabilities';
	import CalendarHeatMapIcon from '$lib/ui/icons/CalendarHeatMapIcon.svelte';

	const vp: any = getContext('viewport');

	/** CONSTANTS */
	const markAsOpenedDelay = 4 * 60 * 1000;
	const todaytz = today(getLocalTimeZone());

	let { data, form } = $props();
	
	let app = $state({
		status: 'loading' as ViewState,
		error: ''
	});

	let currentUserId = $state<string | undefined>(undefined);
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

	/** ---------------------------------------------------------------------------------------------
	 * Local state -- Variables are reset when the recipe changes
	 * -------------------------------------------------------------------------------------------- */
	// Timer used to update the recipe's last_opened after a short delay
	let openedTimer: number | null = null;
	/** Whether the user has indicated they made this recipe today */
	let iMadeThisToday = $state(false);
	/** Whether the user has indicated they did not make this recipe today -- disables `openedTimer` */
	let iDidntMakeThisToday = $state(false);

	let isLocked = $state(true);

	// let promptInput = $state<string>();

	// let promptType = $state<PromptContext>();

	// let conversationMsg = $state<string>();

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

	/** The last date the recipe was opened. ISO string format: "2026-01-05T00:00:00+00:00" */
	let lastCheckoutDateTime = $derived(recipe?.checkout_history?.[recipe?.checkout_history.length - 1] ?? undefined);

	// Responsible for passing the recipe to the FormData
	// let recipeJson = $derived(recipe ? JSON.stringify(recipe) : '');

	let promptRef = $state<HTMLElement>();

	let promptHeight = $derived(promptRef?.clientHeight);

	let lastFormMessage: string | undefined = undefined;

	/**
	 * Track when the recipe object reference changes (not when properties change).
	 * Using recipe.id ensures the effect only runs when switching to a different recipe,
	 * not when the recipe object is mutated.
	 */
	let recipeId = $derived(recipe?.id);

	/** Reset local state when the ID changes */
	$effect(() => {
		const currentId = id;
		if (!currentId) return;

		iMadeThisToday = false;
		iDidntMakeThisToday = false;
		isLocked = true;

		app.status = 'loading';
		openedTimer = null;
	});

	/**
	 * Update the recipe's checkout history and save it to the cloud.
	 * This effect only runs when recipe.id changes (i.e., when switching recipes),
	 * not when recipe properties are mutated.
	 */
	$effect(() => {
		const currentRecipeId = recipeId;
		if (!currentRecipeId || !recipe) return;

		// Recipe loaded successfully
		app.status = 'idle';

		// If the user has indicated they didn't make this today, don't update the checkout history
		if (iDidntMakeThisToday) return;

		// If the recipe was last opened today, set the iMadeThisToday flag and return
		// Because CalendarDate is a date-only object, we need to compare the date portion of the ISO string
		const lastCheckoutDate = lastCheckoutDateTime?.split('T')[0] ?? undefined;
		if (lastCheckoutDate && parseDate(lastCheckoutDate).toString() === todaytz.toString()) {
			iMadeThisToday = true;
			return;
		}
		
		if (openedTimer) {
			clearTimeout(openedTimer);
			openedTimer = null;
		}
		openedTimer = window.setTimeout(async () => {
			try {
				// Use untrack to read recipe properties without tracking them
				const currentRecipe = untrack(() => recipe);
				const checkoutHistory = [...(currentRecipe?.checkout_history ?? []), todaytz.toString()];

				if (hasCloudStorageAccess && syncService) {
					const openedRecipe = { ...currentRecipe, checkout_history: checkoutHistory } as SavedRecipe;
					await syncService.uploadRecipeAndSyncLocal(openedRecipe);
				} else {
					await db.recipes.update(id, { checkout_history: checkoutHistory });
				}
				iMadeThisToday = true;
			} catch (err) {
				console.error('Error updating last_opened:', err);
			} finally {
				openedTimer = null;
			}
		}, markAsOpenedDelay);
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

	/** Revert the user's indication of whether they made this today */
	function toggleLastPreparedDate() {
		if (!recipe) return;
		
		let checkoutHistory: string[] | null = null;
		if (iMadeThisToday) {
			// User reverts their indication of making this today
			iMadeThisToday = false;
			iDidntMakeThisToday = true;
			checkoutHistory = recipe.checkout_history?.slice(0, -1) ?? null;
		} else {
			// User indicates they made this today
			checkoutHistory = [...(recipe.checkout_history ?? []), todaytz.toString()];
			iMadeThisToday = true;
			iDidntMakeThisToday = false;
			// Override the timer if currently running
			if (openedTimer) clearTimeout(openedTimer);
			openedTimer = null;
		}
		recipe.checkout_history = checkoutHistory;
		saveChanges(true);
	}

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
		app.status = 'loading';

		let candidate: SavedRecipe | undefined = undefined;
		let syncError = false;

		if (hasCloudStorageAccess && cloudService) {
			try {
				candidate = await cloudService.uploadLocalRecipe(recipe);
			} catch (err) {
				console.error('Cloud save failed; continuing locally', err);
				syncError = true;
				candidate = { ...recipe, updated_at: new Date().toISOString() };
			}
		} else {
			candidate = { ...recipe, updated_at: new Date().toISOString() };
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
			app.status = 'idle';
		}
	}

	/**
	 * Delete a recipe from the database and redirect to the recipes page
	 * @param id - The id of the recipe to delete
	 */
	async function deleteRecipe(id: string) {
		if (!id || !recipe || recipe.id !== id) return;

		let candidate: SavedRecipe | undefined = undefined;
		let syncError = false;

		const now = new Date().toISOString();

		if (hasCloudStorageAccess && cloudService) {
			app.status = 'loading';
			try {
				candidate = await cloudService.uploadLocalRecipe({ ...recipe, deleted_at: now });
			} catch (err) {
				console.error('Sync failed; continuing locally', err);
				syncError = true;
				candidate = { ...recipe, deleted_at: now, updated_at: now, synced: false, sync_error: err instanceof Error ? err.message : 'Unknown error' };
			} finally {
				app.status = 'idle';
			}
		} else {
			candidate = { ...recipe, deleted_at: now, updated_at: now };
		}

		try {
			await db.recipes.put(candidate);
			if (syncError) {
				toast.info('Recipe was moved to the trash locally but failed to sync to cloud');
			}
			goto('/recipes', { replaceState: true });
		} catch (err) {
			toast.error('There was a problem moving the recipe to the trash');
		}
	}

	/** Open a date picker to update the last prepared date */
	function updateLastPreparedDate() {}

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

		const ALPHA_RX = /^[a-zA-Z]+$/;
		const HOURS_RX = /(\d+)\s?h|(\d+):/g;
		const MINUTES_RX = /(\d+)\s?m|\d+:(\d+)/g;

		let isRange = false;
		let isHours = false;

		let times: string[] = [];

		if (value.includes('-') || value.includes('to')) {
			isRange = true;
		}

		if (isRange) {
			// Handle ranges with a single unit of time, e.g. "10-15 minutes"
			if (value.includes('-')) {
				if (value.includes('hours')) isHours = true;
				value.split('-').forEach((time) => {
					if (!ALPHA_RX.test(time)) {
						times.push(isHours ? `${time} * 60` : `${time}`);
					} else {
						let hours = parseInt(HOURS_RX.exec(time)?.[1] ?? '0');
						let minutes = parseInt(MINUTES_RX.exec(time)?.[1] ?? '0');
						times.push((hours * 60 + minutes).toString());
					}
				});
			} else {
				// Handle ranges with two units of time, e.g. "45 minutes to 1 hour 10 minutes"
				value.split('to').forEach((time) => {
					let hours = parseInt(HOURS_RX.exec(time)?.[1] ?? '0');
					let minutes = parseInt(MINUTES_RX.exec(time)?.[1] ?? '0');
					times.push((hours * 60 + minutes).toString());
				});
			}
		} else {
			let hours = parseInt(HOURS_RX.exec(value)?.[1] ?? '0');
			let minutes = parseInt(MINUTES_RX.exec(value)?.[1] ?? '0');
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
			{#if recipe}
				{#if app.status === 'loading'}
					<div class="grid h-10 w-10 place-content-center">
						<ProgressSpinner size="xs" />
					</div>
				{/if}
				<!-- {#if hasCloudStorageAccess && syncService && network.online}
					<PxlIconButton aria-label="Sync recipe" tooltip="Sync recipe" onclick={() => saveRecipeToCloud(recipe!)}>
						<CloudBackupIcon size="xs" />
					</PxlIconButton>
				{/if} -->
				<PxlIconButton
					aria-label="Update last prepared date"
					tooltip="I made this today"
					onclick={() => {
						toggleLastPreparedDate();
					}}
				>
					<CalendarHeatMapIcon size="xs" class={iMadeThisToday ? 'currentColor' : 'text-dark-40'} />
				</PxlIconButton>
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
					aria-label="Move to trash"
					tooltip="Move to trash"
					onclick={() => {
						deleteRecipe(recipe!.id);
					}}
				>
					<TrashIcon size="xs" />
				</PxlIconButton>
			{/if}
		</AppBar.End>
	</AppBar.Root>
</PageHeader>

<article class="mx-auto max-w-5xl px-4 py-8 lg:px-8" style:padding-bottom={`calc(${promptHeight}px + 1.5rem)`}>
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
