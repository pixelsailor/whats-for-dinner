<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import { Toaster } from 'svelte-sonner';

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
	import { db } from '$lib/db';
	import ChatbotIcon from '$lib/ui/Icons/ChatbotIcon.svelte';
	import SettingsIcon from '$lib/ui/Icons/SettingsIcon.svelte';
	import OpenPanelLeftIcon from '$lib/ui/Icons/OpenPanelLeftIcon.svelte';

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
			// this.#setLayout();
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

	onMount(async () => {
		const prefs = await db.preferences.get('preferences');
		if (!prefs) {
			await db.preferences.put({ id: 'preferences' });
		}
	});

	function toggleSidenav() {
		vp.nav = vp.nav === 'expanded' ? 'collapsed' : 'expanded';
	}
</script>

{#snippet sidenav()}
	<AppBar.Root>
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
	<div class="px-1 -my-1">
		<List>
			<ListItem.Root>
				<ListItem.Link href="/">
					<ChatbotIcon size="xs" />
					New Suggestions
				</ListItem.Link>
			</ListItem.Root>
			<ListItem.Root>
				<ListItem.Link href="/recipes">
					<RecipesIcon size="xs" />
					My Recipes
				</ListItem.Link>
			</ListItem.Root>
		</List>
		<div class="mt-8 px-4">
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
	<div class="fixed bottom-0 px-1 w-full">
		<List>
			<ListItem.Root>
				<ListItem.Link href="/preferences">
					<SettingsIcon size="xs" />
					Preferences
				</ListItem.Link>
			</ListItem.Root>
		</List>
	</div>
{/snippet}

<svelte:window bind:innerWidth={vp.width} />

<QueryClientProvider client={queryClient}>
<div
	class="flex h-full w-full flex-row flex-nowrap overflow-x-hidden"
>
	{#if vp.layout === 'mobile--expanded'}
		<!-- Layout when mobile sidenav is expanded -->
		<div class="sidebar fixed inset-0 z-10 backdrop-blur-md">
			<div class="h-full w-2xs bg-white shadow-md">
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
			<div class="p-1 flex flex-col gap-2">
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
			class="fixed h-full min-h-screen w-2xs flex-none border-r border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900 shadow-xs"
		>
			{@render sidenav()}
		</div>
	{/if}

	<div class={['main-content body h-full min-h-screen relative w-full', {'ml-72': vp.layout === 'desktop--expanded'}]}
		style:margin-left={vp.layout === 'desktop--collapsed' ? 'calc(3.5rem + 1px)' : ''}
	>
		{@render children()}
	</div>
</div>
<Toaster position={vp.device === 'mobile' ? 'top-center' : 'top-right'} />
</QueryClientProvider>


<style>
	.sidebar {
		height: 100%;
	}
</style>
