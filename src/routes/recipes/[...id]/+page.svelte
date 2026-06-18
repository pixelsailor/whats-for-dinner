<script lang="ts">
  // import SvelteMarkdown from '@humanspeak/svelte-markdown';
  import { getLocalTimeZone, parseDate, today } from '@internationalized/date';
  import { onDestroy, untrack } from 'svelte';
  // import { slide } from 'svelte/transition';
  import { toast } from 'svelte-sonner';
  import { DropdownMenu } from 'bits-ui';

  // import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';

  // import type { RecipeAssistanceResponse } from '$lib/api/ai';
  import { CloudService, SyncService } from '$lib/api/cloud';
  import type { SavedRecipe } from '$lib/api/recipe';
  import { db } from '$lib/db';
  import type { ViewState } from '$lib/types';
  // import { setRecipeContext } from '../recipe-context';

  import { AppBar } from '$lib/ui/AppBar';
  import Button from '$lib/ui/button.svelte';
  import FavoriteIcon from '$lib/ui/icons/FavoriteIcon.svelte';
  import FavoriteFilledIcon from '$lib/ui/icons/FavoriteFilledIcon.svelte';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
  // import HelpDrawer from '$lib/ui/help-drawer/help-drawer.svelte';
  // import Prompt from '$lib/ui/Prompt.svelte';
  // import CloseIcon from '$lib/ui/icons/CloseIcon.svelte';
  // import ChatbotIcon from '$lib/ui/icons/ChatbotIcon.svelte';
  import KebabIcon from '$lib/ui/icons/KebabIcon.svelte';
  import TrashIcon from '$lib/ui/icons/TrashIcon.svelte';
  import Recipe from '$lib/ui/Recipe.svelte';
  import { networkStore } from '$lib/stores/network';
  // import { deriveAICapability } from '$lib/api/auth/auth.capability';
  import CalendarHeatMapIcon from '$lib/ui/icons/CalendarHeatMapIcon.svelte';

  // const vp: Viewport = getContext('viewport');

  /** CONSTANTS */
  /** The amount of time to wait before marking the recipe as opened */
  const lastOpenedDelay = 1 * 1000;
  /** The amount of time to wait before updating the recipe's checkout history */
  const checkoutDelay = 4 * 60 * 1000;
  /** We use just the date to make comparisons easier */
  const todaytz = today(getLocalTimeZone());

  let { data } = $props();

  let app = $state({
    status: 'loading' as ViewState,
    error: ''
  });
  // let waiting = $state(false);

  let currentUserId = $derived(data.user?.id);
  let cloudService: CloudService | undefined = $derived(
    currentUserId ? new CloudService(data.supabase, currentUserId) : undefined
  );
  let syncService: SyncService | undefined = $derived(
    cloudService ? new SyncService(cloudService) : undefined
  );

  let network = $derived($networkStore);
  // let aiCapability = $derived(
  //   deriveAICapability({
  //     session: data.session,
  //     permissions: data.permissions,
  //     featureFlags: data.featureFlags,
  //     online: network.online
  //   })
  // );
  // let canUseAI = $derived(aiCapability.canUseAI);
  // let aiRestrictionMessage = $derived.by(() => {
  //   switch (aiCapability.reason) {
  //     case 'offline':
  //       return 'You are offline. Reconnect to ask follow-up questions.';
  //     case 'disabled':
  //       return 'AI recipe assistance is unavailable in this build.';
  //     case 'unauthenticated':
  //       return 'Log in to ask for recipe adjustments.';
  //     case 'unauthorized':
  //       return 'Your account does not include AI recipe assistance.';
  //     default:
  //       return '';
  //   }
  // });

  let hasCloudStorageAccess = $derived(
    data.permissions?.cloudSync.allowed ?? false
  );
  // let hasAIAssistanceAccess = $derived(data.permissions?.aiAssistedRecipe.allowed ?? false);

  let path = $derived(page.params.id as string);
  let isShared = $derived(data.isShared);
  let id = $derived(data.recipeId);

  /** Optimistic patches are scoped to the layout snapshot version they were created from. */
  let optimisticRecipeVersion = $state<string | null>(null);
  let optimisticRecipeChanges = $state<Partial<SavedRecipe> | null>(null);

  /** Detail-session source of truth for the rendered recipe. */
  let workingRecipe = $derived.by<SavedRecipe | null>(() => {
    const loadedRecipe = data.recipe;
    if (!loadedRecipe) return null;
    if (
      optimisticRecipeVersion !== loadedRecipe.updated_at ||
      !optimisticRecipeChanges
    ) {
      return loadedRecipe;
    }

    return {
      ...loadedRecipe,
      ...optimisticRecipeChanges
    };
  });

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

  // let helpDrawerOpen = $state(false);

  // let promptInput = $state<string>();

  // let conversationMsg = $state<string>();

  /** The recipe rendered by the detail page during this visit. */
  let recipe = $derived<SavedRecipe | undefined>(workingRecipe ?? undefined);
  let recipeLoading = $derived(!isShared && !data.recipe);

  /** Responsible for passing the recipe to the FormData */
  // let recipeJson = $derived(recipe ? JSON.stringify(recipe) : '');

  /** The last date the recipe was opened. ISO string format: "2026-01-05T00:00:00+00:00" */
  let lastCheckoutDateTime = $derived(
    recipe?.checkout_history?.[recipe?.checkout_history.length - 1] ?? undefined
  );

  // let promptRef = $state<HTMLElement>();
  // let left = $derived.by(() => {
  //   if (vp.device === 'mobile') return '0';
  //   return vp.nav === 'expanded' ? 'calc(18rem + 1px)' : 'calc(3.75rem + 1px)';
  // });
  // let promptHeight = $derived(promptRef?.clientHeight ?? 0);

  // let lastFormMessage: string | undefined = undefined;

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
        const currentRecipe = untrack(() => workingRecipe);
        if (!currentRecipe) return;

        const checkoutHistory = [
          ...(currentRecipe.checkout_history ?? []),
          todaytz.toString()
        ];

        await applyRecipeChange({ checkout_history: checkoutHistory }, true);
        iMadeThisToday = true;
      } catch (err) {
        console.error('Error updating last_opened:', err);
      } finally {
        checkoutTimer = null;
      }
    }, checkoutDelay);
  });

  onDestroy(() => {
    if (checkoutTimer) clearTimeout(checkoutTimer);
    if (markAsOpenedTimer) clearTimeout(markAsOpenedTimer);
  });

  // React to user prompts
  // $effect(() => {
  //   if (form && form.error === undefined) {
  //     const assistantResponseData = JSON.parse(
  //       form.message
  //     ) as RecipeAssistanceResponse;
  //     if (assistantResponseData?.answer) {
  //       conversationMsg = assistantResponseData.answer;
  //     }
  //     if (assistantResponseData?.recipe && recipe) {
  //       recipe = { ...recipe, ...assistantResponseData.recipe };
  //     }
  //     waiting = false;
  //   } else if (form && form.error) {
  //     waiting = false;
  //     console.error(form.error);
  //     toast.error(`${form.error}`);
  //   }
  // });

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
    void applyRecipeChange({
      is_favorite: recipe.is_favorite === true ? false : true
    });
  }

  /** Revert the user's indication of whether they made this today */
  function toggleLastPreparedDate() {
    if (!workingRecipe) return;

    let checkoutHistory: string[] | null;
    if (iMadeThisToday) {
      // User reverts their indication of making this today
      iMadeThisToday = false;
      iDidntMakeThisToday = true;
      checkoutHistory = workingRecipe.checkout_history?.slice(0, -1) ?? null;
    } else {
      // User indicates they made this today
      checkoutHistory = [
        ...(workingRecipe.checkout_history ?? []),
        todaytz.toString()
      ];
      iMadeThisToday = true;
      iDidntMakeThisToday = false;
      // Override the timer if currently running
      if (checkoutTimer) clearTimeout(checkoutTimer);
      checkoutTimer = null;
    }
    void applyRecipeChange({ checkout_history: checkoutHistory });
  }

  /**
   * Applies an optimistic detail-session change and persists it without reloading layout data.
   * @param changes - Partial recipe fields to apply
   * @param disableToast - Whether to suppress successful save toasts
   */
  async function applyRecipeChange(
    changes: Partial<SavedRecipe>,
    disableToast: boolean = true
  ): Promise<void> {
    if (!workingRecipe) return;

    const updatedAt = new Date().toISOString();
    const persistedChanges: Partial<SavedRecipe> = {
      ...changes,
      updated_at: updatedAt
    };

    const baseVersion = data.recipe?.updated_at ?? workingRecipe.updated_at;
    const existingChanges =
      optimisticRecipeVersion === baseVersion ? optimisticRecipeChanges : null;

    optimisticRecipeVersion = baseVersion;
    optimisticRecipeChanges = {
      ...(existingChanges ?? {}),
      ...persistedChanges
    };

    await saveChanges(disableToast, persistedChanges);
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
    if (!workingRecipe) return;
    app.status = 'loading';

    if (hasCloudStorageAccess && syncService) {
      try {
        // Ensure entire recipe is included if the recipe isn't synced.
        // Unsynced recipes may not exist in the cloud yet; using PATCH/UPDATE can 406.
        if (workingRecipe.synced) {
          const candidate: Partial<SavedRecipe> & { id: string } = changes
            ? { ...changes, id: workingRecipe.id }
            : $state.snapshot(workingRecipe);
          const response =
            await syncService.updateRecipeAndSyncLocal(candidate);
          if (!response.success) {
            toast.error(response.error?.message ?? 'Failed to save recipe');
            return;
          }
        } else {
          const snapshot = $state.snapshot(workingRecipe) as SavedRecipe;
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
          ? { ...changes, id: workingRecipe.id }
          : $state.snapshot(workingRecipe);
        await db.recipes.update(workingRecipe.id, candidate);
        if (!disableToast) {
          toast.success('Recipe saved');
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        app.status = 'idle';
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

        await applyRecipeChange(
          { last_opened: new Date().toISOString() },
          true
        );
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
        <Button
          class="icon text"
          aria-label="I made this today"
          onclick={() => {
            toggleLastPreparedDate();
          }}
        >
          <CalendarHeatMapIcon
            size="xs"
            class={iMadeThisToday ? 'currentColor' : 'text-dark-40'}
          />
        </Button>
        <Button
          class="icon text"
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
        </Button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            {#snippet child({ props })}
              <Button
                {...props}
                type="button"
                class="button icon text"
                aria-label="Recipe actions"
              >
                <KebabIcon size="xs" />
              </Button>
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
                    class="rounded-button text-primary data-highlighted:bg-primary/10 flex h-10 items-center py-3 pr-1.5 pl-3 text-sm font-medium ring-0! ring-transparent! select-none focus-visible:outline-none"
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

<!-- <div class="flex flex-row">
  <div class="flex flex-col grow relative"> -->
<article class="mx-auto max-w-5xl px-4 py-8 lg:px-8">
  {#if isShared}
    <div class="mx-auto grid w-full max-w-3xl place-content-center gap-6">
      <h1 class="fluid-heading-05">Shared recipes are not supported yet.</h1>
    </div>
  {:else if recipeLoading}
    <div class="absolute inset-0 grid place-content-center">
      <ProgressSpinner size="lg" />
    </div>
  {:else if recipe}
    <Recipe {recipe} />
  {/if}
</article>
<!-- {#if !helpDrawerOpen}
      <div
        class="drawer-trigger sticky bottom-8 z-10 flex justify-end px-8 pointer-events-none"
      >
        <div class="button-wrapper bg-background rounded-full">
          <Button
            class="icon rounded-full! h-11! w-11! shadow-md hover:shadow-md! pointer-events-auto"
            tooltip="Ask Saim"
            aria-label="Ask Saim."
            onclick={() => (helpDrawerOpen = !helpDrawerOpen)}
          >
            <ChatbotIcon size="sm" />
          </Button>
        </div>
      </div>
    {/if}
  </div>
  <div
    class={[
      'help-drawer-container relative transition-all duration-300 ease-in-out will-change-transform',
      helpDrawerOpen ? 'w-md' : 'w-0'
    ]}
  >
    <HelpDrawer bind:open={helpDrawerOpen} {data} />
  </div>
</div> -->
