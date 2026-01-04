<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { Toaster, toast } from 'svelte-sonner';

	// import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools';

	import { MIN_DESKTOP_SIZE } from '$lib/constants';
	import { recentlyOpened } from '$lib/stores/recipes';
	import { networkStore } from '$lib/stores/network';
	import { AppBar } from '$lib/ui/AppBar';
	import Button from '$lib/ui/Button/Button.svelte';
	import Dialog from '$lib/ui/Dialog.svelte';
	import RecipesIcon from '$lib/ui/Icons/RecipesIcon.svelte';
	import CollapseSidenavIcon from '$lib/ui/Icons/CollapseSidenavIcon.svelte';
	import '../app.css';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import ChatbotIcon from '$lib/ui/Icons/ChatbotIcon.svelte';
	import SettingsIcon from '$lib/ui/Icons/SettingsIcon.svelte';
	import OpenPanelLeftIcon from '$lib/ui/Icons/OpenPanelLeftIcon.svelte';
	import { NavigationMenu } from 'bits-ui';
	import { PUBLIC_QA_PW, PUBLIC_QA_USER } from '$env/static/public';
	import { invalidate } from '$app/navigation';
	import LogoutIcon from '$lib/ui/Icons/LogoutIcon.svelte';
	import LoginIcon from '$lib/ui/Icons/LoginIcon.svelte';
	import type { SavedRecipe } from '$lib/api/recipe/recipe.types';
	import {
		CloudService,
		SyncService,
		type ConflictResolution,
		type SyncPlan,
		type SyncConflict
	} from '$lib/api/cloud';
	import { resetSyncStore, syncStore, updateSyncStore } from '$lib/stores/sync';
	import { get } from 'svelte/store';

	type Layout = 'mobile--collapsed' | 'mobile--expanded' | 'desktop--collapsed' | 'desktop--expanded';

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

	/**
	 * Viewport helper for responsive layout.
	 * 
	 * Monitors window width and updates the device and layout state.
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
		#device = $state<'desktop' | 'mobile'>('desktop');
		#nav = $state<'collapsed' | 'expanded'>('expanded');
		#layout = $state<Layout>('desktop--expanded');

		get width() {
			return this.#width;
		}
		set width(val) {
			this.#width = val;
			this.device = this.#width < MIN_DESKTOP_SIZE ? 'mobile' : 'desktop';
		}

		get device() {
			return this.#device;
		}
		set device(val: 'desktop' | 'mobile') {
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

	let showLoginDialog = $state(false);

	let email = $state(PUBLIC_QA_USER);
	let password = $state(PUBLIC_QA_PW);
	let loading = $state(false);
	let error = $state('');
	let success = $state('');

	let openCloudSyncDialog = $state(false);
	let syncDialogMode = $state<'none' | 'first-sync' | 'per-recipe'>('none');
	let syncPlan = $state<SyncPlan | null>(null);
	let conflictQueue = $state<SyncConflict[]>([]);
	let currentConflict = $derived(conflictQueue[0] ?? null);
	let syncing = $state(false);

	async function handleSignOut() {
		await supabase.auth.signOut();
		invalidate('supabase:auth');
	}

	onMount(() => {
		// Handle auth state changes
		const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}

			if (event === 'SIGNED_IN' && newSession?.user) {
				runSync(newSession.user.id);
			}
		});

		if (session?.user) {
			runSync(session.user.id);
		}

		return () => data.subscription.unsubscribe();
	});

	function toggleSidenav() {
		vp.nav = vp.nav === 'expanded' ? 'collapsed' : 'expanded';
	}

	async function runSync(userId: string) {
		if (!network.online) {
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
			updateSyncStore({ status: 'awaiting-confirmation' });
			syncDialogMode = 'first-sync';
			openCloudSyncDialog = true;
			return;
		}

		if (plan.scenario === 'download-only') {
			await performDownload(plan.cloudOnly, syncService, { withCancelToast: true });
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
		if (plan.localOnly.length > 0) {
			await performUpload(plan.localOnly, syncService);
		}
		if (plan.cloudOnly.length > 0) {
			await performDownload(plan.cloudOnly, syncService);
		}
		finishSync();
	}

	async function performUpload(recipes: SavedRecipe[], syncService: SyncService) {
		if (!recipes.length) return;
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
		if (!syncPlan || !session?.user) return;
		updateSyncStore({ status: 'syncing' });
		openCloudSyncDialog = false;
		const syncService = new SyncService(new CloudService(supabase, session.user.id));
		await performUpload(syncPlan.localOnly, syncService);
		finishSync();
	}

	async function resolveCurrentConflict(action: 'upload' | 'download') {
		if (!currentConflict || !session) return;
		const syncService = new SyncService(new CloudService(supabase, session.user.id));
		await syncService.resolveConflict(currentConflict, action);
		conflictQueue = conflictQueue.slice(1);
		updateSyncStore((state) => ({
			...state,
			progress: {
				...state.progress,
				uploaded: action === 'upload' ? state.progress.uploaded + 1 : state.progress.uploaded,
				downloaded:
					action === 'download' ? state.progress.downloaded + 1 : state.progress.downloaded
			}
		}));

		if (conflictQueue.length === 0 && syncPlan) {
			openCloudSyncDialog = false;
			updateSyncStore({ status: 'syncing' });
			if (syncPlan.localOnly.length > 0) {
				await performUpload(syncPlan.localOnly, syncService);
			}
			if (syncPlan.cloudOnly.length > 0) {
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

	async function resolveAutoConflicts(conflicts: ConflictResolution[], syncService: SyncService) {
		if (!conflicts.length) return;
		await syncService.resolveConflictsAutomatically(conflicts);

		const uploads = conflicts.filter((item) => item.action === 'upload').length;
		const downloads = conflicts.filter((item) => item.action === 'download').length;
		updateSyncStore((state) => ({
			...state,
			progress: {
				...state.progress,
				uploaded: state.progress.uploaded + uploads,
				downloaded: state.progress.downloaded + downloads
			}
		}));

		toast.success(
			`Automatically resolved ${conflicts.length} conflict${conflicts.length === 1 ? '' : 's'}`
		);
	}

	/**
	 * Format sync time using
	 */
	const formatSyncTime = (value?: number | string | Date | null) =>
		value ? new Date(value).toLocaleString() : 'Never synced';
</script>

{#snippet sidenav()}
	<AppBar.Root disableMobileNav>
		<Button size="md" href="/" icon>
			<ChatbotIcon />
		</Button>
		<AppBar.Text primary="" />
		<AppBar.End>
			<Button size="xs" onClick={toggleSidenav} label="Minimize navigation panel" icon>
				<CollapseSidenavIcon />
			</Button>
		</AppBar.End>
	</AppBar.Root>

	<div class="w-full overflow-x-hidden px-2">
		<NavigationMenu.Root orientation="vertical">
			<NavigationMenu.List>
				<NavigationMenu.Item>
					<NavigationMenu.Link href="/" class="sidenav-link hover:bg-gray-200 dark:hover:bg-gray-800">
						<ChatbotIcon size="xs" />
						<span class="sidenav-link__text">What's For Dinner?</span>
					</NavigationMenu.Link>
				</NavigationMenu.Item>
				<NavigationMenu.Item>
					<NavigationMenu.Link href="/recipes" class="sidenav-link hover:bg-gray-200 dark:hover:bg-gray-800">
						<RecipesIcon size="xs" />
						<span class="sidenav-link__text">My Recipes</span>
					</NavigationMenu.Link>
				</NavigationMenu.Item>
			</NavigationMenu.List>
		</NavigationMenu.Root>
		<div class="mx-3 mt-8 mb-2">
			<span class="heading-compact text-gray-500">Recent recipes</span>
		</div>
		{#if $recentlyOpened.length === 0}
			<p class="helper-text m-3 italic">Your recently viewed recipes will appear here.</p>
		{:else if $recentlyOpened.length > 0}
			<NavigationMenu.Root orientation="vertical">
				<NavigationMenu.List>
					{#each $recentlyOpened as recipe (recipe.id)}
						<NavigationMenu.Item>
							<NavigationMenu.Link
								href="/recipes/{recipe.id}"
								class="sidenav-link hover:bg-gray-200 dark:hover:bg-gray-800"
							>
								<span class="sidenav-link__text">{recipe.title}</span>
							</NavigationMenu.Link>
						</NavigationMenu.Item>
					{/each}
				</NavigationMenu.List>
			</NavigationMenu.Root>
		{/if}
		{#if !network.online}
			<div
				class="mt-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100"
			>
				Offline mode: cloud sync and AI features are temporarily disabled.
			</div>
		{/if}
	</div>
	<div class="absolute bottom-0 left-0 w-full p-2">
		<NavigationMenu.Root orientation="vertical">
			<NavigationMenu.List>
				{#if session}
					<NavigationMenu.Item>
						<NavigationMenu.Link class="sidenav-link hover:bg-gray-200 dark:hover:bg-gray-800" href="/preferences">
							<SettingsIcon size="xs" />
							<span class="sidenav-link__text">Preferences</span>
						</NavigationMenu.Link>
					</NavigationMenu.Item>
					<NavigationMenu.Item>
						<button class="sidenav-link hover:bg-gray-200 dark:hover:bg-gray-800" onclick={handleSignOut}>
							<LogoutIcon size="xs" />
							<span class="sidenav-link__text">{session.user.email}</span>
						</button>
					</NavigationMenu.Item>
				{:else}
					<NavigationMenu.Item>
						<NavigationMenu.Link class="sidenav-link hover:bg-gray-200 dark:hover:bg-gray-800" href="/auth">
							<LoginIcon size="xs" />
							<span class="sidenav-link__text">Log in</span>
						</NavigationMenu.Link>
					</NavigationMenu.Item>
				{/if}
			</NavigationMenu.List>
		</NavigationMenu.Root>
	</div>
{/snippet}

<!-- Update the viewport width when the window is resized -->
<svelte:window bind:innerWidth={vp.width} />

<QueryClientProvider client={queryClient}>
	<div class="flex h-full w-full flex-row">
		<div
			class="relative w-0 flex-none"
			style:width={vp.layout === 'desktop--collapsed'
				? 'calc(4rem + 1px)'
				: vp.layout === 'desktop--expanded'
					? 'calc(18rem + 1px)'
					: ''}
		>
			{#if vp.layout === 'mobile--expanded'}
				<!-- Layout when mobile sidenav is expanded -->
				<div class="sidebar fixed inset-0 z-10 backdrop-blur-md">
					<div class="h-full w-2xs border-gray-200 bg-gray-100 shadow-md dark:border-gray-700 dark:bg-gray-900">
						{@render sidenav()}
					</div>
				</div>
			{:else if vp.layout === 'mobile--collapsed'}
				<!-- Layout when mobile sidenav is collapsed/hidden -->
			{:else if vp.layout === 'desktop--collapsed'}
				<!-- Layout when desktop sidenav is minimized -->
				<div
					class="fixed h-full min-h-screen w-min flex-none border-r border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900"
				>
					<AppBar.Root>
						<AppBar.Start>
							<Button size="xs" onClick={toggleSidenav} label="Toggle side-nav" icon>
								<OpenPanelLeftIcon />
							</Button>
						</AppBar.Start>
					</AppBar.Root>
					<div class="flex flex-col gap-2 p-1">
						<Button href="/" size="xs" label="Home" icon>
							<ChatbotIcon />
						</Button>
						<Button href="/recipes" size="xs" label="My Recipes" icon>
							<RecipesIcon />
						</Button>
					</div>
					<div class="fixed bottom-0 px-1 py-2">
						<Button href="/preferences" size="xs" label="My Recipes" icon>
							<SettingsIcon />
						</Button>
					</div>
				</div>
			{:else}
				<!-- Standard desktop Layout with sidenav expanded -->
				<div
					class="fixed h-full min-h-screen w-2xs flex-none border-r border-gray-200 bg-gray-100 shadow-xs dark:border-gray-700 dark:bg-gray-900/50"
				>
					{@render sidenav()}
				</div>
			{/if}
		</div>

		<main class="main-content body relative h-full min-h-screen w-full flex-1">
			{@render children()}
		</main>
	</div>

	<!-- Cloud sync dialog -->
	<Dialog bind:open={openCloudSyncDialog}>
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
					We found {syncPlan?.localOnly.length ?? 0} recipe(s) on this device. Upload them to your cloud account?
				</p>
			{:else if syncDialogMode === 'per-recipe' && currentConflict}
				<p>
					{currentConflict.local.title} has changes in both places. Choose the copy you want to keep.
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
						Last synced: {formatSyncTime(currentConflict.local.last_synced_at ?? null)}
					</p>
				</div>
				<div class="rounded border border-gray-200 p-3 dark:border-gray-800">
					<p class="font-semibold">Cloud version</p>
					<p class="text-sm">{currentConflict.cloud.title}</p>
					<p class="text-xs text-gray-500">
						Last synced: {formatSyncTime(currentConflict.cloud.last_synced_at ?? null)}
					</p>
				</div>
			</div>
		{/if}
		{#snippet actions()}
			{#if syncDialogMode === 'first-sync'}
				<div class="flex justify-end gap-2">
					<Button size="sm" cue="text" onClick={() => openCloudSyncDialog = false}>
						Skip
					</Button>
					<Button size="sm" onClick={handleFirstSyncConfirm}>Upload to cloud</Button>
				</div>
			{:else if syncDialogMode === 'per-recipe' && currentConflict}
				<div class="flex flex-col gap-2">
					<Button size="sm" cue="text" onClick={() => resolveCurrentConflict('download')}>
						Download cloud version
					</Button>
					<Button size="sm" onClick={() => resolveCurrentConflict('upload')}>Upload device version</Button>
				</div>
			{:else}
				<Button
					size="sm"
					cue="text"
					onClick={() => openCloudSyncDialog = false}
				>
					Close
				</Button>
			{/if}
		{/snippet}
	</Dialog>

	<!-- Toast notifications -->
	<Toaster position={vp.device === 'mobile' ? 'top-center' : 'top-right'} />
</QueryClientProvider>

<style>
	.sidebar {
		height: 100%;
	}

	:global(.sidenav-link) {
		color: currentColor;
		display: flex;
		justify-content: flex-start;
		gap: 1rem;
		font-size: 0.875rem;
		width: 100%;
		align-items: center;
		border-radius: 0.25rem;
		padding: 0.5rem 0.75rem;
	}

	:global(.sidenav-link__text) {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
