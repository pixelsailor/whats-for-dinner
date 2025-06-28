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

	type Layout = 'mobile--collapsed' | 'mobile--expanded' | 'desktop--collapsed' | 'desktop--expanded';

	let { children } = $props();

	class Viewport {
		#width = $state(0);
		#device = $state<'desktop' | 'mobile'>('desktop')
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

	function toggleSidenav() {
		vp.nav = vp.nav === 'expanded' ? 'collapsed' : 'expanded';
	}
</script>

{#snippet sidenav()}
	<AppBar.Root>
		<AppBar.End>
			<Button size="xs" onClick={toggleSidenav} label="Get new suggestions" icon>
				<CollapseSidenavIcon />
			</Button>
		</AppBar.End>
	</AppBar.Root>
	<List>
		<ListItem.Root>
			<ListItem.Link href="/recipes">
				<RecipesIcon size="xs" />
				My Recipes
			</ListItem.Link>
		</ListItem.Root>
	</List>
	<div class="px-4 mt-8">
		<span class="text-sm font-bold text-gray-500">Recent recipes</span>
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
{/snippet}

<svelte:window bind:innerWidth={vp.width}/>

<div class="flex flex-nowrap h-full w-full flex-row overflow-x-hidden bg-gray-50 dark:bg-black dark:text-gray-100">
	{#if vp.layout === 'mobile--expanded'}
		<!-- Layout when mobile sidenav is expanded -->
		<div class="sidebar fixed inset-0 z-10 backdrop-blur-md">
			<div class="w-2xs h-full bg-white shadow-md">
				{@render sidenav()}
			</div>
		</div>
	{:else if vp.layout === 'mobile--collapsed'}
		<!-- Layout when mobile sidenav is collapsed/hidden -->
	{:else if vp.layout === 'desktop--collapsed'}
		<!-- Layout when desktop sidenav is minimized -->
		<div class="h-full w-min min-h-screen bg-gray-100 border-r border-gray-200 flex-none">
			<AppBar.Root>
				<AppBar.Start>
					<Button size="xs" onClick={toggleSidenav} label="Toggle side-nav" icon>
						<CollapseSidenavIcon />
					</Button>
				</AppBar.Start>
			</AppBar.Root>
			<List>
				<ListItem.Root>
					<ListItem.Link href="/recipes">
						<RecipesIcon size="xs" />
					</ListItem.Link>
				</ListItem.Root>
			</List>
		</div>
	{:else}
		<!-- Standard desktop Layout with sidenav expanded -->
		<div class="h-full w-2xs min-h-screen bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-none">
			{@render sidenav()}
		</div>
	{/if}
	
	<div class="main-content relative w-full">
		{@render children()}
	</div>
</div>

<Toaster position={vp.device === 'mobile' ? 'top-center' : 'top-right'} />

<style>
	.sidebar {
		height: 100%;
	}
</style>