<script lang="ts">
	import { Button } from 'bits-ui';
	import { slide } from 'svelte/transition';
	import { SvelteSet } from 'svelte/reactivity';
	import { toast } from 'svelte-sonner';
	import { MultiSelect, type SelectOptionType } from 'flowbite-svelte';

	import { db } from '$lib/db';
	import { recipes } from '$lib/stores/recipes';
	
	import { AppBar } from '$lib/ui/AppBar';
	// import Button.Root from '$lib/ui/Button.Root/Button.Root.svelte';
	import PxlIconButton from '$lib/ui/PxlIconButton.svelte';
	import { List, ListItem } from '$lib/ui/List';
	import CloudBackupIcon from '$lib/ui/Icons/CloudBackupIcon.svelte';
	import DocumentAddIcon from '$lib/ui/Icons/DocumentAddIcon.svelte';
	import TrashIcon from '$lib/ui/Icons/TrashIcon.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';

	let { data } = $props();
	
	const commonTags = new SvelteSet<string>();

	let tags = $derived.by<SelectOptionType<string>[]>(() => Array.from(commonTags).map((t) => ({ value: t, name: t })));

	let selectedTags = $state<string[]>([]);

	let search = $state<string>();

	// Suggestions filtered by search and tags
	let filteredRecipes = $derived.by(() => {
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

	// Populate the tags set with the tags from the recipes
	$effect(() => {
		if ($recipes.data) {
			$recipes.data.forEach((r) => {
				if (r.tags && r.tags.length > 0) {
					if (typeof r.tags === 'string') {
						commonTags.add(r.tags);
					} else {
						r.tags.forEach((t) => {
							commonTags.add(t);
						});
					}
				}
			});
		}
	});

	function syncRecipeStore() {
		console.log('syncRecipeStore');
	}

	async function deleteRecipe(id: string, title: string) {
		const deletedAt = new Date().toISOString();

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
			<Button.Root href="/recipes/new" aria-label="Add a recipe" class="button text narrow">
				<DocumentAddIcon size="xs" />
				<span class="hidden md:inline">Add a recipe</span>
			</Button.Root>
			<Button.Root href="/recipes/trash" aria-label="Open trash" class="button icon text">
				<TrashIcon size="xs" />
			</Button.Root>
			<!-- {#if data.session}
				<PxlIconButton onClick={syncRecipeStore} aria-label="Sync recipes" tooltip="Sync recipes">
					<CloudBackupIcon size="xs" />
				</PxlIconButton>
			{/if} -->
		</AppBar.End>
	</AppBar.Root>
</PageHeader>

<div class="mx-auto max-w-5xl px-4 lg:px-8 py-8">
	{#if $recipes.loading}
		<div class="absolute inset-0 grid place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{:else if $recipes.error}
		<div class="mx-auto grid h-screen w-full max-w-3xl place-content-center gap-6">
			<h1 class="fluid-heading-05">Ah donkey-spittle! There was a problem.</h1>
			<p class="flex items-center gap-3">
				<span class="fluid-heading-03">{$recipes.error.name}</span><span>|</span><span>{$recipes.error?.message}</span>
			</p>
		</div>
	{:else if $recipes.data}
		<h1 class="fluid-heading-05 mb-8">My Recipes</h1>
		<div class="my-12 grid w-full grid-cols-2 gap-4">
			<input
				type="text"
				class="label my-1 flex h-12 w-full flex-row flex-nowrap items-stretch rounded-sm border border-gray-200 px-3 dark:border-gray-700 dark:bg-gray-900 hover:dark:bg-gray-800"
				placeholder="Search history"
				bind:value={search}
			/>
			<MultiSelect items={tags} bind:value={selectedTags} placeholder="Filter by tag" />
		</div>
		<div class="list">
			{#each filteredRecipes! as recipe (recipe.id)}
				<hr />
				<Button.Root href="/recipes/{recipe.id}" class="listitem button text narrow">
					<span class="listitem__content">
						<span class="title-medium">{recipe.title}</span>
						<span class="body-medium text-foreground-alt dark:text-foreground-alt">{recipe.short_description}</span>
					</span>
					<span class="listitem__end">
						<PxlIconButton
							aria-label="Delete recipe"
							tooltip="Delete recipe"
							tooltipPosition="left"
							onclick={(event: MouseEvent) => {
								event.stopPropagation();
								deleteRecipe(recipe.id, recipe.title);
							}}
						>
							<TrashIcon size="xs" />
						</PxlIconButton>
					</span>
				</Button.Root>
			{/each}
		</div>
	{/if}
</div>
