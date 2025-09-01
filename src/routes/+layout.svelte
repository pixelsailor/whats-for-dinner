<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { Toaster } from 'svelte-sonner';

	import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools'

	import { MIN_DESKTOP_SIZE } from '$lib/constants';
	import { recentlyOpened } from '$lib/stores/recipes';
	import { List, ListItem } from '$lib/ui/List';
	import { AppBar } from '$lib/ui/AppBar';
	import Button from '$lib/ui/Button/Button.svelte';
	import MenuIcon from '$lib/ui/Icons/MenuIcon.svelte';
	import RecipesIcon from '$lib/ui/Icons/RecipesIcon.svelte';
	import CollapseSidenavIcon from '$lib/ui/Icons/CollapseSidenavIcon.svelte';
	import '../app.css';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { db } from '$lib/db/local';
	import ChatbotIcon from '$lib/ui/Icons/ChatbotIcon.svelte';
	import SettingsIcon from '$lib/ui/Icons/SettingsIcon.svelte';
	import OpenPanelLeftIcon from '$lib/ui/Icons/OpenPanelLeftIcon.svelte';
	import { Dialog } from 'bits-ui';
	import { PUBLIC_QA_PW, PUBLIC_QA_USER } from '$env/static/public';
	import { supabase } from '$lib/supabaseClient';

	type Layout =
		| 'mobile--collapsed'
		| 'mobile--expanded'
		| 'desktop--collapsed'
		| 'desktop--expanded';

	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				enabled: browser,
				retry: 2,
				// staleTime: 5 * 60 * 1000 // 5 minutes
			}
		}
	});

	let { children } = $props();

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

	async function handleLogin() {
		loading = true;
		error = '';
		success = '';

		const { data, error: authError } = await supabase.auth.signInWithPassword({
			email,
			password
		});

		if (authError) {
			error = authError.message;
			loading = false;
			return;
		}

		success = 'Login successful!';
		loading = false;
	}

	onMount(async () => {
		const prefs = await db.preferences.get('preferences');
		if (!prefs) {
			await db.preferences.put({ id: 'preferences' });
		}
	});

	function toggleSidenav() {
		vp.nav = vp.nav === 'expanded' ? 'collapsed' : 'expanded';
	}

	// function openLoginDialog() {
	// 	console.log('openLoginDialog');

	// }
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
	<div class="-my-1 overflow-x-hidden px-5">
		<List>
			<ListItem.Root>
				<ListItem.Link href="/">
					<ChatbotIcon size="xs" />
					What's For Dinner?
				</ListItem.Link>
			</ListItem.Root>
			<ListItem.Root>
				<ListItem.Link href="/recipes">
					<RecipesIcon size="xs" />
					My Recipes
				</ListItem.Link>
			</ListItem.Root>
		</List>
		<div class="mt-8">
			<span class="heading-compact text-gray-500">Recent recipes</span>
		</div>
		{#if $recentlyOpened.length === 0}
			<p>Your recently viewed recipes will appear.</p>
		{:else if $recentlyOpened.length > 0}
			<List>
				{#each $recentlyOpened as recipe}
					<ListItem.Root>
						<ListItem.Link href="/recipes/{recipe.id}">
							{recipe.title}
						</ListItem.Link>
					</ListItem.Root>
				{/each}
			</List>
		{/if}
	</div>
	<div class="absolute bottom-0 w-full px-5">
		<List>
			<ListItem.Root>
				<ListItem.Link href="/preferences">
					<SettingsIcon size="xs" />
					Preferences
				</ListItem.Link>
			</ListItem.Root>
			<ListItem.Root>
				<ListItem.Button onClick={() => (showLoginDialog = true)}>Log In</ListItem.Button>
			</ListItem.Root>
		</List>
	</div>
{/snippet}

<svelte:window bind:innerWidth={vp.width} />

<QueryClientProvider client={queryClient}>
	<div class="flex h-full w-full flex-row flex-nowrap overflow-x-hidden">
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
				class="fixed h-full min-h-screen w-2xs flex-none border-r border-gray-200 bg-gray-100 shadow-xs dark:border-gray-700 dark:bg-gray-900"
			>
				{@render sidenav()}
			</div>
		{/if}

		<div
			class={[
				'main-content body relative h-full min-h-screen w-full',
				{ 'ml-72': vp.layout === 'desktop--expanded' }
			]}
			style:margin-left={vp.layout === 'desktop--collapsed' ? 'calc(3.5rem + 1px)' : ''}
		>
			{@render children()}
		</div>
	</div>

	<Dialog.Root bind:open={showLoginDialog}>
		<Dialog.Portal>
			<Dialog.Overlay
				class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80"
			/>
			<Dialog.Content
				class="shadow-popover data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] rounded-lg border bg-gray-50 p-5 outline-hidden sm:max-w-[490px] md:w-full dark:bg-black dark:text-gray-300"
			>
				<Dialog.Title>Log In</Dialog.Title>
				<Dialog.Description>Log in to sync to the cloud</Dialog.Description>

				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleLogin();
					}}
				>
					<div>
						<label for="email">Email:</label>
						<input
							type="email"
							id="email"
							bind:value={email}
							required
							disabled={loading}
							autocomplete="off"
						/>
					</div>

					<div>
						<label for="password">Password:</label>
						<input
							type="password"
							id="password"
							bind:value={password}
							required
							disabled={loading}
						/>
					</div>

					<button type="submit" disabled={loading}>
						{loading ? 'Logging in...' : 'Login'}
					</button>
				</form>
			</Dialog.Content>
		</Dialog.Portal>
	</Dialog.Root>

	<Toaster position={vp.device === 'mobile' ? 'top-center' : 'top-right'} />
</QueryClientProvider>

<style>
	.sidebar {
		height: 100%;
	}
</style>
