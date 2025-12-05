<script lang="ts">
	import { slide } from 'svelte/transition';
	import { SvelteSet } from 'svelte/reactivity';
	import { toast } from 'svelte-sonner';
	import { MultiSelect } from 'flowbite-svelte'

	import { db } from '$lib/db';
	import { recipes } from '$lib/stores/recipes';
	import type { SavedRecipe } from '$lib/types';
	import Button from '$lib/ui/Button/Button.svelte';
	import { List, ListItem } from '$lib/ui/List';
	import TrashIcon from '$lib/ui/Icons/TrashIcon.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import { AppBar } from '$lib/ui/AppBar';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import RecipesIcon from '$lib/ui/Icons/RecipesIcon.svelte';
	import CloudBackup from '$lib/ui/Icons/CloudBackup.svelte';

	let { data } = $props();

	const commonTags = $derived.by(() => {
		const tags = new SvelteSet<string>();
		$recipes.data?.forEach((r) => {
			r.tags.forEach((t) => {
				tags.add(t);
			});
		});
		return Array.from(tags).map((t) => ({ value: t, name: t }));
	});

	let selectedTags = $state<string[]>([]);

	let search = $state<string>();
	
	// Suggestions filtered by search and tags
	let filteredRecipes: SavedRecipe[] = $derived.by(() => {
		console.log('filteredRecipes');
		
		let results = $recipes.data;
		if (!results) return [];

		const titleSearch = search?.toLowerCase().trim() || '';
		const hasSearch = Boolean(search && search.length > 1);
		const hasFilters = selectedTags && selectedTags.length > 0;
		if (!hasSearch && !hasFilters) {
			return results;
		}

		return results.filter((r) => {
			const searchMatches = !hasSearch || r.title.toLowerCase().includes(titleSearch);
			const tagMatches = !hasFilters || selectedTags.every((t) => r.tags.includes(t));
			return searchMatches && tagMatches;
		});
	});
	
	function syncRecipeStore() {
		console.log('syncRecipeStore');
		
	}

	async function deleteRecipe(id: string, title: string) {
		// if (confirm('Delete this recipe?')) {
		const deletedAt = Date.now();

		try {
			await db.recipes.update(id, { deleted_at: deletedAt });

			toast.success(`"${title}" deleted`, {
				action: {
					label: 'Undo',
					onClick: async () => {
						await db.recipes.update(id, { deleted_at: undefined });
						toast.success(`"${title}" restored`);
					}
				},
				duration: 5000
			});
		} catch (err) {
			toast.error('Failed to delete recipe');
			console.error(err);
		}
		// }
	}
</script>

<PageHeader>
	<AppBar.Root>
		<AppBar.Text primary="My Recipes" />
		<AppBar.End>
			{#if data.session}
				<Button onClick={syncRecipeStore} size="xs" label="Cloud sync" title="Cloud sync" icon>
					<CloudBackup size="xs" />
				</Button>
			{/if}
			<Button href="/recipes/new" size="xs">
				<RecipesIcon size="xs" />
				<span class="ml-2 hidden md:inline">Add a recipe</span>
			</Button>
			<Button title="Trash bin" href="/recipes/trash" size="xs">
				<TrashIcon size="xs" />
				<span class="ml-2 hidden md:inline">Trash</span>
			</Button>
		</AppBar.End>
	</AppBar.Root>
</PageHeader>

<main class="mx-auto min-h-screen max-w-5xl px-4">
	{#if $recipes.loading}
		<div class="mx-auto grid h-screen w-full max-w-3xl place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{:else if $recipes.error}
		<div class="mx-auto grid h-screen w-full max-w-3xl place-content-center gap-6">
			<h1 class="fluid-heading-05">Ah donkey-spittle! There was a problem.</h1>
			<p class="flex items-center gap-3">
				<span class="fluid-heading-03">{$recipes.error.name}</span><span>|</span><span
					>{$recipes.error?.message}</span
				>
			</p>
		</div>
	{:else if $recipes.data}
		<div class="py-24">
			<h1 class="fluid-heading-05 mb-8">My Recipes</h1>
			<div class="my-12 w-full grid grid-cols-2 gap-4">
        <input
          type="text"
          class="label my-1 flex h-12 w-full flex-row flex-nowrap items-stretch rounded-sm border border-gray-200 px-3 dark:border-gray-700 dark:bg-gray-900 hover:dark:bg-gray-800"
          placeholder="Search history"
          bind:value={search}
        />
				<MultiSelect items={commonTags} bind:value={selectedTags} placeholder="Filter by tag" />
      </div>
			<List size="two-line">
				{#each filteredRecipes! as recipe (recipe.id)}
					<hr class="border-gray-200 dark:border-gray-800" />
					<div transition:slide={{ duration: 300, axis: 'y' }}>
						<ListItem.Root>
							<ListItem.Link href="/recipes/{recipe.id}">
								<ListItem.Text primary={recipe.title} secondary={recipe.short_description} />
							</ListItem.Link>
							<ListItem.SecondaryAction>
								<Button
									title="Delete recipe"
									onClick={() => deleteRecipe(recipe.id, recipe.title)}
									label="Delete recipe"
									size="xs"
									icon
								>
									<TrashIcon />
								</Button>
							</ListItem.SecondaryAction>
						</ListItem.Root>
					</div>
				{/each}
			</List>
		</div>
	{/if}
</main>
