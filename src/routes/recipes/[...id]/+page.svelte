<script lang="ts">
  import SvelteMarkdown from '@humanspeak/svelte-markdown';
  import {
    getLocalTimeZone,
    parseDate,
    parseTime,
    today
  } from '@internationalized/date';
  import { getContext, onDestroy, onMount, untrack } from 'svelte';
  import { slide } from 'svelte/transition';
  import { toast } from 'svelte-sonner';
  import { Button, DropdownMenu } from 'bits-ui';

  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';

  import type { RecipeAssistanceResponse } from '$lib/api/ai';
  import { CloudService, SyncService } from '$lib/api/cloud';
  import type { SavedRecipe } from '$lib/api/recipe';
  import { db } from '$lib/db';
  import { getRecipeStore } from '$lib/stores/recipes';
  import type { ViewState, Viewport } from '$lib/types';

  import { AppBar } from '$lib/ui/AppBar';
  import FavoriteIcon from '$lib/ui/icons/FavoriteIcon.svelte';
  import FavoriteFilledIcon from '$lib/ui/icons/FavoriteFilledIcon.svelte';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
  import Prompt from '$lib/ui/Prompt.svelte';
  import CloseIcon from '$lib/ui/icons/CloseIcon.svelte';
  import KebabIcon from '$lib/ui/icons/KebabIcon.svelte';
  import TrashIcon from '$lib/ui/icons/TrashIcon.svelte';
  import Recipe from '$lib/ui/Recipe.svelte';
  import { networkStore } from '$lib/stores/network';
  import { deriveAICapability } from '$lib/api/auth/auth.capability';
  import CalendarHeatMapIcon from '$lib/ui/icons/CalendarHeatMapIcon.svelte';

  const vp: Viewport = getContext('viewport');

  /** CONSTANTS */
  /** The amount of time to wait before marking the recipe as opened */
  const lastOpenedDelay = 1 * 1000;
  /** The amount of time to wait before updating the recipe's checkout history */
  const checkoutDelay = 4 * 60 * 1000;
  const todaytz = today(getLocalTimeZone());

  let { data, form } = $props();

  let app = $state({
    status: 'loading' as ViewState,
    error: ''
  });
  let waiting = $state(false);

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
  let aiRestrictionMessage = $derived.by(() => {
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

  let hasCloudStorageAccess = $derived(
    data.permissions?.cloudSync.allowed ?? false
  );
  // let hasAIAssistanceAccess = $derived(data.permissions?.aiAssistedRecipe.allowed ?? false);

  let path = $derived(page.params.id as string);

  let isShared = $derived(path.startsWith('shared/'));
  let id = $derived(isShared ? path.split('/')[1] : path);

  /** ---------------------------------------------------------------------------------------------
   * Local state -- Variables are reset when the recipe changes
   * -------------------------------------------------------------------------------------------- */
  /** Timer used to update the recipe's last_opened after a short delay */
  let markAsOpenedTimer: number | null = null;
  /** Tracks the last recipe id that was successfully marked as opened (per component lifetime) */
  let markedAsOpenedRecipeId = $state<string | null>(null);
  /** Small bounded retry counter if recipe isn't loaded when timer fires */
  let markAsOpenedAttempts = $state(0);
  /** Tracks which route recipe id we've initialized local state for (guards against invalidation loops) */
  let initializedRecipeRouteId: string | null = null;
  /** Timer used to update the recipe's checkout history after a short delay */
  let checkoutTimer: number | null = null;
  /** Whether the user has indicated they made this recipe today */
  let iMadeThisToday = $state(false);
  /** Whether the user has indicated they did not make this recipe today -- disables `checkoutTimer` */
  let iDidntMakeThisToday = $state(false);

  let promptInput = $state<string>();

  let conversationMsg = $state<string>();

  let recipeStore = $derived.by(() => {
    if (!id) return undefined;

    if (isShared) {
      throw new Error('Shared recipes not yet supported');
    } else {
      return getRecipeStore(id);
    }
  });

  type RecipeStoreValue = {
    data: SavedRecipe | null;
    loading: boolean;
    error: Error | null;
  };

  /** Current live-query snapshot (subscribed manually to avoid `$recipeStore` usage) */
  let recipeStoreValue = $state<RecipeStoreValue>({
    data: null,
    loading: true,
    error: null
  });

  /** Subscribe to the active recipe store */
  $effect(() => {
    const store = recipeStore;
    if (!store) {
      recipeStoreValue = { data: null, loading: true, error: null };
      return;
    }

    const unsubscribe = store.subscribe((value) => {
      recipeStoreValue = value;
    });

    return () => unsubscribe();
  });

  /** The current recipe from the store */
  let recipe = $derived<SavedRecipe | undefined>(
    recipeStoreValue.data ?? undefined
  );

  /** Responsible for passing the recipe to the FormData */
  let recipeJson = $derived(recipe ? JSON.stringify(recipe) : '');

  /** The last date the recipe was opened. ISO string format: "2026-01-05T00:00:00+00:00" */
  let lastCheckoutDateTime = $derived(
    recipe?.checkout_history?.[recipe?.checkout_history.length - 1] ?? undefined
  );

  let promptRef = $state<HTMLElement>();
  let left = $derived.by(() => {
    if (vp.device === 'mobile') return '0';
    return vp.nav === 'expanded' ? 'calc(18rem + 1px)' : 'calc(3.75rem + 1px)';
  });
  let promptHeight = $derived(promptRef?.clientHeight ?? 0);

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
    if (initializedRecipeRouteId === currentId) return;
    initializedRecipeRouteId = currentId;

    iMadeThisToday = false;
    iDidntMakeThisToday = false;
    markedAsOpenedRecipeId = null;
    markAsOpenedAttempts = 0;

    app.status = 'loading';
    if (checkoutTimer) {
      clearTimeout(checkoutTimer);
      checkoutTimer = null;
    }
    if (markAsOpenedTimer) {
      clearTimeout(markAsOpenedTimer);
      markAsOpenedTimer = null;
    }

    markAsOpened();
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
    if (
      lastCheckoutDate &&
      parseDate(lastCheckoutDate).toString() === todaytz.toString()
    ) {
      iMadeThisToday = true;
      return;
    }

    if (checkoutTimer) {
      clearTimeout(checkoutTimer);
      checkoutTimer = null;
    }
    checkoutTimer = window.setTimeout(async () => {
      try {
        // Use untrack to read recipe properties without tracking them
        const currentRecipe = untrack(() => recipe);
        const checkoutHistory = [
          ...(currentRecipe?.checkout_history ?? []),
          todaytz.toString()
        ];

        if (hasCloudStorageAccess && syncService) {
          const openedRecipe = {
            ...currentRecipe,
            checkout_history: checkoutHistory
          } as SavedRecipe;
          await syncService.uploadRecipeAndSyncLocal(openedRecipe);
        } else {
          await db.recipes.update(id, { checkout_history: checkoutHistory });
        }
        iMadeThisToday = true;
      } catch (err) {
        console.error('Error updating last_opened:', err);
      } finally {
        checkoutTimer = null;
      }
    }, checkoutDelay);
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
    if (checkoutTimer) clearTimeout(checkoutTimer);
    if (markAsOpenedTimer) clearTimeout(markAsOpenedTimer);
  });

  // React to user prompts
  $effect(() => {
    if (form && form.error === undefined) {
      const assistantResponseData = JSON.parse(
        form.message
      ) as RecipeAssistanceResponse;
      if (assistantResponseData?.answer) {
        conversationMsg = assistantResponseData.answer;
      }
      if (assistantResponseData?.recipe && recipe) {
        recipe = { ...recipe, ...assistantResponseData.recipe };
      }
      waiting = false;

      // 	// clone the snapshot to avoid "DataCloneError" in `saveModifiedRecipe()`
      // 	const originalRecipe = structuredClone($state.snapshot(recipe)) as SavedRecipe;

      // 	try {
      // 		recipe = JSON.parse(message) as SavedRecipe;
      // 		toast.dismiss();
      // 		toast.success(`"${recipe.title}" has unsaved changes`, {
      // 			duration: Number.POSITIVE_INFINITY,
      // 			// action: {
      // 			// 	label: 'Save changes',
      // 			// 	onClick: () => saveModifiedRecipe(originalRecipe)
      // 			// }
      // 		});
      // 	} catch (err) {
      // 		console.error(err);
      // 		toast.error('There was a problem parsing the recipe JSON');
      // 	}
      // }
    } else if (form && form.error) {
      waiting = false;
      console.error(form.error);
      toast.error(`${form.error}`);
    }
  });

  /**
   * Manually push the current recipe to the cloud.
   * @param recipeId - Id of the recipe to sync.
   */
  async function syncRecipe(recipeId: string) {
    if (!recipe || recipe.id !== recipeId) return;
    if (!hasCloudStorageAccess || !syncService) {
      toast.error('Cloud sync is not available for your account.');
      return;
    }
    if (!network.online) {
      toast.error('You are offline. Reconnect to sync this recipe.');
      return;
    }

    app.status = 'loading';
    try {
      const snapshot = $state.snapshot(recipe) as SavedRecipe;
      const response = await syncService.syncRecipeToCloud(snapshot);
      if (response.success) {
        toast.success('Recipe synced');
      } else {
        toast.error(response.error?.message ?? 'Sync failed');
      }
    } finally {
      app.status = 'idle';
    }
  }

  /**
   * Toggle the recipe's `is_favorite` status
   */
  function toggleFavorite() {
    if (!recipe) return;
    saveChanges(true, {
      is_favorite: recipe.is_favorite === true ? false : true
    });
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
      checkoutHistory = [
        ...(recipe.checkout_history ?? []),
        todaytz.toString()
      ];
      iMadeThisToday = true;
      iDidntMakeThisToday = false;
      // Override the timer if currently running
      if (checkoutTimer) clearTimeout(checkoutTimer);
      checkoutTimer = null;
    }
    recipe.checkout_history = checkoutHistory;
    saveChanges(true, { checkout_history: checkoutHistory });
  }

  /**
   * Save recipe changes
   *
   * If available, upload the recipe to the cloud and sync the local database.
   * If unavailable or the upload fails, save the recipe locally.
   *
   * @param disableToast - If true, successful toast notifications will not be shown
   * @param changes - Optional changes to the recipe to save. Reduces payload size if provided.
   * If not provided, the entire recipe object will be saved.
   */
  async function saveChanges(
    disableToast: boolean = false,
    changes?: Partial<SavedRecipe>
  ) {
    if (!recipe) return;
    app.status = 'loading';

    if (hasCloudStorageAccess && syncService) {
      try {
        // Ensure entire recipe is included if the recipe isn't synced.
        // Unsynced recipes may not exist in the cloud yet; using PATCH/UPDATE can 406.
        if (recipe.synced) {
          const candidate: Partial<SavedRecipe> & { id: string } = changes
            ? { ...changes, id: recipe.id }
            : $state.snapshot(recipe);
          const response =
            await syncService.updateRecipeAndSyncLocal(candidate);
          if (!response.success) {
            toast.error(response.error?.message ?? 'Failed to save recipe');
            return;
          }
        } else {
          const snapshot = $state.snapshot(recipe) as SavedRecipe;
          const fullCandidate = (
            changes ? { ...snapshot, ...changes } : snapshot
          ) as SavedRecipe;
          const response = await syncService.syncRecipeToCloud(fullCandidate);
          if (!response.success) {
            toast.error(response.error?.message ?? 'Failed to save recipe');
            return;
          }
        }
        if (!disableToast) {
          toast.success('Recipe saved');
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        app.status = 'idle';
      }
    } else {
      try {
        const candidate: Partial<SavedRecipe> & { id: string } = changes
          ? { ...changes, id: recipe.id }
          : $state.snapshot(recipe);
        await db.recipes.update(recipe.id, candidate);
        if (!disableToast) {
          toast.success('Recipe saved');
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Unknown error');
      }
    }
  }

  /**
   * Delete a recipe from the database and cloud.
   * Updates the `deleted_at` timestamp to the current time. Recipes are kept for 30 days before
   * being removed from the database.
   * @param id - The id of the recipe to delete.
   */
  const deleteRecipe = async (id: string) => {
    if (!id) return;
    const now = new Date().toISOString();
    if (hasCloudStorageAccess && syncService) {
      const response = await syncService.updateRecipeAndSyncLocal({
        id,
        deleted_at: now
      });
      if (!response.success) {
        toast.error('There was a problem trying to restore the recipe.');
        return;
      } else {
        goto(resolve('/recipes'), { replaceState: true });
      }
    } else {
      await db.recipes.update(id, { deleted_at: now });
      goto(resolve('/recipes'), { replaceState: true });
    }
  };

  /** Update the recipe's last_opened timestamp */
  function markAsOpened() {
    const routeId = untrack(() => id);
    if (!routeId) return;

    // Hard guard: only mark opened once per route id (per view), regardless of subsequent edits/updates.
    if (markedAsOpenedRecipeId === routeId) return;

    // Important: do NOT clear/reschedule if already scheduled. This prevents loops caused by recipe updates.
    if (markAsOpenedTimer) return;

    // We want to throttle this to prevent edge cases that could cause the `recipe.id` to change,
    // triggering a loop of updates.
    markAsOpenedTimer = window.setTimeout(async () => {
      try {
        const timerId = untrack(() => id);
        if (!timerId) return;

        // If the recipe still isn't available when the timer fires, retry briefly (bounded).
        const timerRecipe = untrack(() => recipe);
        if (!timerRecipe) {
          if (markAsOpenedAttempts < 5) {
            markAsOpenedAttempts += 1;
            markAsOpenedTimer = null;
            window.setTimeout(markAsOpened, 250);
          }
          return;
        }
        if (timerRecipe.id !== timerId) return;

        // Soft guard: if already opened today, mark as done and stop (prevents daily background writes).
        const lastOpenedDate =
          timerRecipe.last_opened?.split('T')[0] ?? undefined;
        if (
          lastOpenedDate &&
          parseDate(lastOpenedDate).toString() === todaytz.toString()
        ) {
          markedAsOpenedRecipeId = timerId;
          return;
        }

        await saveChanges(true, { last_opened: new Date().toISOString() });
        markedAsOpenedRecipeId = timerId;
      } catch (err) {
        console.error('Error marking recipe as opened:', err);
      } finally {
        markAsOpenedTimer = null;
      }
    }, lastOpenedDelay);
  }

  /** Open a date picker to update the last prepared date */
  // function updateLastPreparedDate() {}

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
  // function convertAiTime(value: string | undefined): string[] {
  //   if (!value) return ['0'];

  //   const ALPHA_RX = /^[a-zA-Z]+$/;
  //   const HOURS_RX = /(\d+)\s?h|(\d+):/g;
  //   const MINUTES_RX = /(\d+)\s?m|\d+:(\d+)/g;

  //   let isRange = false;
  //   let isHours = false;

  //   let times: string[] = [];

  //   if (value.includes('-') || value.includes('to')) {
  //     isRange = true;
  //   }

  //   if (isRange) {
  //     // Handle ranges with a single unit of time, e.g. "10-15 minutes"
  //     if (value.includes('-')) {
  //       if (value.includes('hours')) isHours = true;
  //       value.split('-').forEach((time) => {
  //         if (!ALPHA_RX.test(time)) {
  //           times.push(isHours ? `${time} * 60` : `${time}`);
  //         } else {
  //           let hours = parseInt(HOURS_RX.exec(time)?.[1] ?? '0');
  //           let minutes = parseInt(MINUTES_RX.exec(time)?.[1] ?? '0');
  //           times.push((hours * 60 + minutes).toString());
  //         }
  //       });
  //     } else {
  //       // Handle ranges with two units of time, e.g. "45 minutes to 1 hour 10 minutes"
  //       value.split('to').forEach((time) => {
  //         let hours = parseInt(HOURS_RX.exec(time)?.[1] ?? '0');
  //         let minutes = parseInt(MINUTES_RX.exec(time)?.[1] ?? '0');
  //         times.push((hours * 60 + minutes).toString());
  //       });
  //     }
  //   } else {
  //     let hours = parseInt(HOURS_RX.exec(value)?.[1] ?? '0');
  //     let minutes = parseInt(MINUTES_RX.exec(value)?.[1] ?? '0');
  //     times.push((hours * 60 + minutes).toString());
  //   }

  //   console.log('convertAiTime', value, times);
  //   return times;
  // }
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
        <Button.Root
          class="button icon text"
          aria-label="I made this today"
          onclick={() => {
            toggleLastPreparedDate();
          }}
        >
          <CalendarHeatMapIcon
            size="xs"
            class={iMadeThisToday ? 'currentColor' : 'text-dark-40'}
          />
        </Button.Root>
        <Button.Root
          class="button icon text"
          aria-label={recipe?.is_favorite
            ? 'Remove from favorites'
            : 'Add to favorites'}
          onclick={toggleFavorite}
        >
          {#if recipe?.is_favorite}
            <FavoriteFilledIcon size="xs" />
          {:else}
            <FavoriteIcon size="xs" />
          {/if}
        </Button.Root>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <Button.Root
                {...props}
                type="button"
                class="button icon text"
                aria-label="Recipe actions"
              >
                <KebabIcon size="xs" />
              </Button.Root>
            {/snippet}
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              class="border-muted bg-background shadow-popover w-[229px] rounded-xl border px-1 py-1.5 outline-hidden focus-visible:outline-hidden"
              sideOffset={8}
            >
              <DropdownMenu.Group aria-label="Recipe actions">
                <DropdownMenu.Item textValue="Edit recipe">
                  {#snippet child({ props })}
                    <a
                      {...props}
                      href={resolve(`/recipes/${path}/edit`)}
                      class="rounded-button data-highlighted:bg-muted flex h-10 w-full items-center py-3 pr-1.5 pl-3 text-sm font-medium no-underline ring-0! ring-transparent! select-none focus-visible:outline-none"
                    >
                      Edit recipe
                    </a>
                  {/snippet}
                </DropdownMenu.Item>
                {#if hasCloudStorageAccess && syncService}
                  <DropdownMenu.Item
                    textValue="Sync recipe"
                    onclick={() => syncRecipe(recipe!.id)}
                  >
                    Sync recipe
                  </DropdownMenu.Item>
                {/if}
                <DropdownMenu.Item
                  textValue="Move to trash"
                  class="rounded-button text-destructive data-highlighted:bg-destructive/10 flex h-10 items-center py-3 pr-1.5 pl-3 text-sm font-medium ring-0! ring-transparent! select-none focus-visible:outline-none"
                  onSelect={() => {
                    deleteRecipe(recipe!.id);
                  }}
                >
                  <span class="flex items-center gap-2">
                    <TrashIcon size="xs" />
                    Move to trash
                  </span>
                </DropdownMenu.Item>
              </DropdownMenu.Group>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      {/if}
    </AppBar.End>
  </AppBar.Root>
</PageHeader>

<article
  class="mx-auto max-w-5xl px-4 py-8 lg:px-8"
  style:padding-bottom={`calc(${promptHeight}px + 1.5rem)`}
>
  {#if recipeStoreValue.loading}
    <div class="absolute inset-0 grid place-content-center">
      <ProgressSpinner size="lg" />
    </div>
  {:else if recipeStoreValue.error}
    <div class="mx-auto grid w-full max-w-3xl place-content-center gap-6">
      <h1 class="fluid-heading-05">Ah donkey-spittle! There was a problem.</h1>
      <p class="flex items-center gap-3">
        <span class="fluid-heading-03">{recipeStoreValue.error.name}</span><span
          >|</span
        ><span>{recipeStoreValue.error?.message}</span>
      </p>
    </div>
  {:else if recipe}
    <Recipe {recipe} />
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
              <Button.Root
                class="button text icon"
                title="Clear"
                onclick={() => (conversationMsg = '')}
              >
                <CloseIcon size="xs" />
              </Button.Root>
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
              class="grow border-none bg-gray-100 p-1 placeholder:text-gray-500 dark:bg-gray-900 dark:placeholder:text-gray-400"
              type="text"
              name="input"
              bind:value={promptInput}
              placeholder="Make changes or ask a recipe related question"
            />
            <input type="hidden" name="recipe" bind:value={recipeJson} />
            <Button.Root
              type="submit"
              disabled={waiting || !promptInput?.trim()}
              class="button text narrow"
            >
              {waiting ? 'Thinking...' : 'Submit'}
            </Button.Root>
          </form>
        </Prompt>
      </div>
    {:else if aiRestrictionMessage}
      <div
        class="mt-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100"
      >
        {aiRestrictionMessage}
      </div>
    {/if}
  {/if}
</article>
