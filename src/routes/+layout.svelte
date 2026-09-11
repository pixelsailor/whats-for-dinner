<script lang="ts">
  import { Tooltip } from 'bits-ui';
  import { onMount, setContext } from 'svelte';
  import { get } from 'svelte/store';
  import { Toaster, toast } from 'svelte-sonner';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';

  // import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools';

  import { browser } from '$app/environment';
  import { invalidate } from '$app/navigation';

  import { deriveCloudCapability } from '$lib/api/auth';
  import {
    CloudService,
    type ConflictResolution,
    type SyncConflict,
    type SyncPlan,
    SyncService,
    flushPendingLastOpened,
    getPendingLastOpenedIds,
    startLastOpenedBatchSync
  } from '$lib/api/cloud';
  import type { SavedRecipe } from '$lib/api/recipe/recipe.types';
  import { networkStore } from '$lib/stores/network';
  import { recentlyOpenedStore } from '$lib/stores/recipes';
  import { resetSyncStore, syncStore, updateSyncStore } from '$lib/stores/sync';
  import Asidenav from '$lib/ui/asidenav/asidenav.svelte';
  import Button from '$lib/ui/button.svelte';
  import Dialog from '$lib/ui/Dialog.svelte';
  import '../app.css';

  type Layout =
    | 'mobile--collapsed'
    | 'mobile--expanded'
    | 'desktop-narrow--collapsed'
    | 'desktop-narrow--expanded'
    | 'desktop--collapsed'
    | 'desktop--expanded';

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        enabled: browser,
        retry: 2
        // staleTime: 5 * 60 * 1000 // 5 minutes
      }
    }
  });

  let { children, data } = $props();
  let { session, supabase } = $derived(data);
  let network = $derived($networkStore);
  let cloudCapability = $derived(
    deriveCloudCapability({
      session,
      permissions: data.permissions,
      online: network.online
    })
  );
  let canReadCloud = $derived(cloudCapability.canReadCloud);
  let canWriteCloud = $derived(cloudCapability.canWriteCloud);

  /**
   * Viewport helper for responsive layout.
   *
   * Monitors window width and updates the device and layout state. A "mobile" `device` setting puts the sidenav in a "detached" state.
   *
   * @example
   * ```typescript
   * const vp = new Viewport();
   * vp.width = window.innerWidth;
   * console.log(vp.device);
   * console.log(vp.layout);
   * ```
   */
  class Viewport {
    #width = $state(0);
    #device = $state<'desktop' | 'desktop-narrow' | 'mobile'>('desktop');
    #nav = $state<'collapsed' | 'expanded'>('expanded');
    #layout = $state<Layout>('desktop--expanded');

    get width() {
      return this.#width;
    }
    set width(val) {
      this.#width = val;
      this.device =
        this.#width < 640
          ? 'mobile'
          : this.#width < 1024
            ? 'desktop-narrow'
            : 'desktop';

      if (this.#width < 1024) {
        this.nav = 'collapsed';
      }
    }

    get device() {
      return this.#device;
    }
    set device(val: 'desktop' | 'desktop-narrow' | 'mobile') {
      this.#device = val;
      this.nav = val === 'mobile' ? 'collapsed' : 'expanded';
    }

    get nav() {
      return this.#nav;
    }
    set nav(val: 'collapsed' | 'expanded') {
      this.#nav = val;
      this.#setLayout();
    }

    get layout() {
      return this.#layout;
    }
    set layout(val: Layout) {
      this.#layout = val;
    }

    constructor() {}

    #setLayout() {
      this.#layout = `${this.#device}--${this.#nav}`;
    }
  }

  const vp = new Viewport();

  setContext('viewport', vp);

  let openCloudSyncDialog = $state(false);
  let syncDialogMode = $state<'none' | 'first-sync' | 'per-recipe'>('none');
  let syncPlan = $state<SyncPlan | null>(null);
  let conflictQueue = $state<SyncConflict[]>([]);
  let currentConflict = $derived(conflictQueue[0] ?? null);
  let syncing = $state(false);
  let wasOnline = $state(browser ? navigator.onLine : true);

  let recentlyOpened = $derived($recentlyOpenedStore.data ?? []);

  function createSyncServiceForUser(): SyncService | null {
    const userId = session?.user?.id;
    if (!userId) {
      return null;
    }

    return new SyncService(new CloudService(supabase, userId));
  }

  function flushPendingLastOpenedIfNeeded() {
    if (getPendingLastOpenedIds().size === 0) {
      return;
    }

    const syncService = createSyncServiceForUser();
    if (!syncService) {
      return;
    }

    void flushPendingLastOpened({
      syncService,
      canWriteCloud,
      online: network.online
    });
  }

  async function verifySessionAndSignOutIfExpired() {
    if (!session) {
      return;
    }

    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error || !user) {
      await supabase.auth.signOut();
      invalidate('supabase:auth');
    }
  }

  onMount(() => {
    const stopLastOpenedBatchSync = startLastOpenedBatchSync({
      getSyncService: createSyncServiceForUser,
      getCanWriteCloud: () => canWriteCloud,
      getOnline: () => network.online
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (
          event === 'SIGNED_OUT' ||
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED'
        ) {
          invalidate('supabase:auth');
        }

        if (event === 'SIGNED_IN' && newSession?.user) {
          runSync(newSession.user.id);
        }
      }
    );

    function onVisibilityChange() {
      if (document.visibilityState === 'visible' && session) {
        void verifySessionAndSignOutIfExpired();
        flushPendingLastOpenedIfNeeded();
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange);

    if (session?.user) {
      runSync(session.user.id);
    }

    return () => {
      stopLastOpenedBatchSync();
      authListener.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  });

  $effect(() => {
    if (!browser) {
      return;
    }

    const expiresAt = session?.expires_at;
    if (!expiresAt) {
      return;
    }

    const timer = setTimeout(
      () => {
        void verifySessionAndSignOutIfExpired();
      },
      Math.max(expiresAt * 1000 - Date.now() + 1000, 0)
    );

    return () => clearTimeout(timer);
  });

  /** Re-run cloud sync when the browser reconnects after being offline. */
  $effect(() => {
    if (!browser) {
      return;
    }

    const online = network.online;
    const userId = session?.user?.id;

    if (online && !wasOnline && userId && !syncing) {
      void runSync(userId);
    }

    if (online && !wasOnline) {
      flushPendingLastOpenedIfNeeded();
    }

    wasOnline = online;
  });

  async function runSync(userId: string) {
    if (!network.online || (!canReadCloud && !canWriteCloud)) {
      return;
    }

    const cloudService = new CloudService(supabase, userId);
    const syncService = new SyncService(cloudService);

    resetSyncStore();
    syncing = true;
    updateSyncStore({
      status: 'checking',
      cancelRequested: false,
      progress: { uploaded: 0, downloaded: 0, total: 0 }
    });

    try {
      const plan = await syncService.buildPlan();
      syncPlan = plan;
      updateSyncStore({
        scenario: plan.scenario,
        localOnly: plan.localOnly,
        cloudOnly: plan.cloudOnly,
        conflicts: plan.conflicts,
        progress: {
          uploaded: 0,
          downloaded: 0,
          total:
            plan.localOnly.length +
            plan.cloudOnly.length +
            (plan.autoResolvable?.length ?? 0) +
            (plan.manualConflicts?.length ?? 0)
        }
      });

      await handlePlan(plan, syncService);
    } catch (err) {
      console.error('Cloud sync failed', err);
      updateSyncStore({
        status: 'error',
        message: err instanceof Error ? err.message : 'Cloud sync failed'
      });
      toast.error('Cloud sync failed');
      syncing = false;
    }
  }

  async function handlePlan(plan: SyncPlan, syncService: SyncService) {
    if (plan.scenario === 'empty') {
      updateSyncStore({ status: 'complete' });
      syncing = false;
      return;
    }

    if (plan.scenario === 'first-sync') {
      // Local recipes + empty cloud: upload requires write_cloud.
      if (!canWriteCloud) {
        updateSyncStore({ status: 'complete' });
        syncing = false;
        return;
      }
      updateSyncStore({ status: 'awaiting-confirmation' });
      syncDialogMode = 'first-sync';
      openCloudSyncDialog = true;
      return;
    }

    if (plan.scenario === 'download-only') {
      if (!canReadCloud) {
        updateSyncStore({ status: 'complete' });
        syncing = false;
        return;
      }
      await performDownload(plan.cloudOnly, syncService, {
        withCancelToast: true
      });
      const afterDownload = get(syncStore);
      if (afterDownload.cancelRequested || afterDownload.status === 'error') {
        return;
      }
      finishSync();
      return;
    }

    if (plan.scenario === 'no-conflicts') {
      await syncNonConflicts(plan, syncService);
      return;
    }

    // has-conflicts
    if (plan.autoResolvable?.length) {
      updateSyncStore({ status: 'syncing' });
      await resolveAutoConflicts(plan.autoResolvable, syncService);
    }

    if (plan.manualConflicts?.length) {
      conflictQueue = plan.manualConflicts;
      updateSyncStore({ status: 'awaiting-confirmation' });
      syncDialogMode = 'per-recipe';
      openCloudSyncDialog = true;
      return;
    }

    await syncNonConflicts(plan, syncService);
  }

  async function syncNonConflicts(plan: SyncPlan, syncService: SyncService) {
    updateSyncStore({ status: 'syncing' });
    if (canWriteCloud && plan.localOnly.length > 0) {
      await performUpload(plan.localOnly, syncService);
    }
    if (canReadCloud && plan.cloudOnly.length > 0) {
      await performDownload(plan.cloudOnly, syncService);
    }
    finishSync();
  }

  async function performUpload(
    recipes: SavedRecipe[],
    syncService: SyncService
  ) {
    if (!canWriteCloud || !recipes.length) return;
    await syncService.uploadRecipes(recipes);
    updateSyncStore((state) => ({
      ...state,
      progress: {
        ...state.progress,
        uploaded: state.progress.uploaded + recipes.length
      }
    }));
  }

  async function performDownload(
    recipes: SavedRecipe[],
    syncService: SyncService,
    options?: { withCancelToast?: boolean }
  ) {
    if (!recipes.length) return;

    let toastId: string | number | undefined;
    if (options?.withCancelToast) {
      toastId = toast.info(`Downloading ${recipes.length} recipes...`, {
        action: {
          label: 'Cancel',
          onClick: () => updateSyncStore({ cancelRequested: true })
        },
        duration: 10000
      });
      updateSyncStore({ toastId });
    }

    for (const recipe of recipes) {
      const currentState = get(syncStore);
      if (currentState.cancelRequested) {
        if (toastId) toast.dismiss(toastId);
        updateSyncStore({ status: 'error', message: 'Download canceled' });
        syncing = false;
        return;
      }
      await syncService.downloadRecipes([recipe]);
      updateSyncStore((state) => ({
        ...state,
        progress: {
          ...state.progress,
          downloaded: state.progress.downloaded + 1
        }
      }));
    }

    if (toastId) toast.dismiss(toastId);
  }

  async function handleFirstSyncConfirm() {
    if (!canWriteCloud || !syncPlan || !session?.user) return;
    updateSyncStore({ status: 'syncing' });
    openCloudSyncDialog = false;
    const syncService = new SyncService(
      new CloudService(supabase, session.user.id)
    );
    await performUpload(syncPlan.localOnly, syncService);
    finishSync();
  }

  async function resolveCurrentConflict(action: 'upload' | 'download') {
    if (!currentConflict || !session) return;
    if (action === 'upload' && !canWriteCloud) return;
    if (action === 'download' && !canReadCloud) return;

    const syncService = new SyncService(
      new CloudService(supabase, session.user.id)
    );
    await syncService.resolveConflict(currentConflict, action);
    conflictQueue = conflictQueue.slice(1);
    updateSyncStore((state) => ({
      ...state,
      progress: {
        ...state.progress,
        uploaded:
          action === 'upload'
            ? state.progress.uploaded + 1
            : state.progress.uploaded,
        downloaded:
          action === 'download'
            ? state.progress.downloaded + 1
            : state.progress.downloaded
      }
    }));

    if (conflictQueue.length === 0 && syncPlan) {
      openCloudSyncDialog = false;
      updateSyncStore({ status: 'syncing' });
      if (canWriteCloud && syncPlan.localOnly.length > 0) {
        await performUpload(syncPlan.localOnly, syncService);
      }
      if (canReadCloud && syncPlan.cloudOnly.length > 0) {
        await performDownload(syncPlan.cloudOnly, syncService);
      }
      finishSync();
    }
  }

  function finishSync() {
    updateSyncStore({ status: 'complete' });
    toast.success('Sync completed');
    syncing = false;
  }

  async function resolveAutoConflicts(
    conflicts: ConflictResolution[],
    syncService: SyncService
  ) {
    if (!conflicts.length) return;

    const allowed = conflicts.filter((item) => {
      if (item.action === 'upload') return canWriteCloud;
      if (item.action === 'download') return canReadCloud;
      return false;
    });
    if (!allowed.length) return;

    await syncService.resolveConflictsAutomatically(allowed);

    const uploads = allowed.filter((item) => item.action === 'upload').length;
    const downloads = allowed.filter(
      (item) => item.action === 'download'
    ).length;
    updateSyncStore((state) => ({
      ...state,
      progress: {
        ...state.progress,
        uploaded: state.progress.uploaded + uploads,
        downloaded: state.progress.downloaded + downloads
      }
    }));

    toast.success(
      `Automatically resolved ${allowed.length} conflict${allowed.length === 1 ? '' : 's'}`
    );
  }

  /**
   * Format sync time using
   */
  const formatSyncTime = (value?: number | string | Date | null) =>
    value ? new Date(value).toLocaleString() : 'Never synced';
</script>

<!-- Update the viewport width when the window is resized -->
<svelte:window bind:innerWidth={vp.width} />

<QueryClientProvider client={queryClient}>
  <Tooltip.Provider>
    <div class="layout-container flex h-dvh w-full flex-row">
      <div
        class={['nav-container relative', vp.device === 'mobile' ? 'w-0' : '']}
        style:width={vp.layout === 'desktop--collapsed' ||
        vp.layout.includes('desktop-narrow')
          ? 'calc(3.25rem + 1px)'
          : vp.layout === 'desktop--expanded'
            ? 'calc(18rem + 1px)'
            : ''}
      >
        {#if vp.layout === 'mobile--expanded'}
          <!-- Layout when mobile sidenav is expanded -->
          <div class="sidebar fixed inset-0 z-10 backdrop-blur-md">
            <div
              class="bg-background-alt border-border h-full w-2xs shadow-md dark:border-gray-700 dark:bg-gray-900"
            >
              <Asidenav {session} {recentlyOpened} {network} {supabase} />
            </div>
          </div>
        {:else}
          <!-- Standard desktop Layout with sidenav expanded -->
          <div
            class={[
              'border-border bg-background-alt h-full border-r',
              vp.device === 'desktop' ? 'fixed' : 'absolute z-10',
              vp.nav === 'expanded' ? 'w-2xs' : 'w-fit',
              vp.layout === 'desktop-narrow--expanded'
                ? 'shadow-lg'
                : 'shadow-xs'
            ]}
          >
            <Asidenav {session} {recentlyOpened} {network} {supabase} />
          </div>
        {/if}
      </div>

      <main
        class="main-content body relative h-full min-h-screen w-full flex-1 overflow-x-hidden"
      >
        {@render children()}
      </main>
    </div>
  </Tooltip.Provider>

  <!-- Cloud sync dialog -->
  <Dialog bind:open={openCloudSyncDialog} hideCloseButton>
    {#snippet title()}
      {#if syncDialogMode === 'first-sync'}
        <h1>Sync recipes to the cloud?</h1>
      {:else if syncDialogMode === 'per-recipe'}
        <h1>Choose which version to keep</h1>
      {:else}
        <h1>Cloud sync</h1>
      {/if}
    {/snippet}
    {#snippet description()}
      {#if syncDialogMode === 'first-sync'}
        <p>
          We found {syncPlan?.localOnly.length ?? 0} recipe(s) on this device. Upload
          them to your cloud account?
        </p>
      {:else if syncDialogMode === 'per-recipe' && currentConflict}
        <p>
          {currentConflict.local.title} has changes in both places. Choose the copy
          you want to keep.
        </p>
      {:else}
        <p>Manage cloud sync.</p>
      {/if}
    {/snippet}
    {#if syncDialogMode === 'per-recipe' && currentConflict}
      <div class="space-y-3">
        <div class="rounded border border-gray-200 p-3 dark:border-gray-800">
          <p class="font-semibold">Device version</p>
          <p class="text-sm">{currentConflict.local.title}</p>
          <p class="text-xs text-gray-500">
            Last synced: {formatSyncTime(
              currentConflict.local.last_synced_at ?? null
            )}
          </p>
        </div>
        <div class="rounded border border-gray-200 p-3 dark:border-gray-800">
          <p class="font-semibold">Cloud version</p>
          <p class="text-sm">{currentConflict.cloud.title}</p>
          <p class="text-xs text-gray-500">
            Last synced: {formatSyncTime(
              currentConflict.cloud.last_synced_at ?? null
            )}
          </p>
        </div>
      </div>
    {/if}
    {#snippet actions()}
      {#if syncDialogMode === 'first-sync'}
        <div class="flex justify-end gap-2">
          <Button class="text" onclick={() => (openCloudSyncDialog = false)}
            >Skip</Button
          >
          <Button class="text" onclick={handleFirstSyncConfirm}
            >Upload to cloud</Button
          >
        </div>
      {:else if syncDialogMode === 'per-recipe' && currentConflict}
        <div class="flex flex-col gap-2">
          {#if canReadCloud}
            <Button
              class="text"
              onclick={() => resolveCurrentConflict('download')}
              >Download cloud version</Button
            >
          {/if}
          {#if canWriteCloud}
            <Button onclick={() => resolveCurrentConflict('upload')}
              >Upload device version</Button
            >
          {/if}
        </div>
      {:else}
        <Button class="text" onclick={() => (openCloudSyncDialog = false)}
          >Close</Button
        >
      {/if}
    {/snippet}
  </Dialog>

  <!-- Toast notifications -->
  <Toaster position={vp.device === 'mobile' ? 'top-center' : 'top-right'} />
</QueryClientProvider>

<style lang="postcss">
  @reference "tailwindcss";

  .sidebar {
    height: 100%;
    height: -webkit-fill-available;
  }

  :global(.sidenav-link) {
    color: currentColor;
    display: flex;
    justify-content: flex-start;
    gap: 1rem;
    font-size: 0.875rem;
    align-items: center;
    border-radius: var(--button-radius);
    padding: 0.5rem 0.75rem;
  }

  :global(.button-group .sidenav-link) {
    border-radius: 0;
    border-top-left-radius: var(--button-radius);
    border-bottom-left-radius: var(--button-radius);
  }

  :global(.button-group .sidenav-link:last-child) {
    border-radius: 0;
    border-top-right-radius: var(--button-radius);
    border-bottom-right-radius: var(--button-radius);
  }

  :global(.sidenav-link__text) {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
