<script lang="ts">
	import { Button, Select as BitsSelect } from 'bits-ui';
	import { SvelteSet } from 'svelte/reactivity';
	import { toast } from 'svelte-sonner';

	import { db } from '$lib/db';
	import { recipesStore } from '$lib/stores/recipes';
	
	import { AppBar } from '$lib/ui/AppBar';
	import DocumentAddIcon from '$lib/ui/icons/DocumentAddIcon.svelte';
	import TrashIcon from '$lib/ui/icons/TrashIcon.svelte';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import PxlIconButton from '$lib/ui/PxlIconButton.svelte';
	import Select from '$lib/ui/Select.svelte';
	import type { SelectOption } from '$lib/ui/types.js';
	import type { SavedRecipe } from '$lib/api/recipe';
	import ArrowUpIcon from '$lib/ui/icons/ArrowUpIcon.svelte';
	import ArrowDownIcon from '$lib/ui/icons/ArrowDownIcon.svelte';
	import CheveronSortIcon from '$lib/ui/icons/CheveronSortIcon.svelte';
	import { parseAbsoluteToLocal } from '@internationalized/date';

	let { data } = $props();

	let recipes = $derived<SavedRecipe[]>($recipesStore.data ?? []);
	
	const commonTags = new SvelteSet<string>();

	let tags = $derived.by<SelectOption[]>(() => Array.from(commonTags).map((t) => ({ value: t, label: t })) || []);

	let selectedTags = $state<string[]>([]);

	let search = $state<string>();

	let sortOptions = $state<SelectOption[]>([
		{ value: 'title', label: 'Title' },
		{ value: 'created_at', label: 'Created' },
		{ value: 'last_made', label: 'Last made' }
	]);
	let selectedSort = $state<string>('title');
	let sortDirection = $state<string>('asc');

	// Suggestions filtered by search and tags
	let filteredRecipes = $derived.by(() => {
		if (!recipes.length) return [];

		const titleSearch = search?.toLowerCase().trim() || '';
		const hasSearch = Boolean(search && search.length > 1);
		const hasFilters = selectedTags && selectedTags.length > 0;

		return recipes.filter((r) => {
			const searchMatches = !hasSearch || r.title.toLowerCase().includes(titleSearch);
			const tagMatches = !hasFilters || selectedTags.every((t) => r.tags.map((t) => t.toLowerCase()).includes(t.toLowerCase()));
			return searchMatches && tagMatches;
		}).sort((a, b) => {
			if (selectedSort === 'title') {
				return sortDirection === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
			} else if (selectedSort === 'created_at') {
				return sortDirection === 'asc' ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at);
			} else if (selectedSort === 'last_made') {
				const epoch = new Date(0).toISOString(); // If no date it's never been made; use epoch
				const aDate = parseAbsoluteToLocal(a.checkout_history?.at(-1) ?? epoch);
				const bDate = parseAbsoluteToLocal(b.checkout_history?.at(-1) ?? epoch);
				return sortDirection === 'asc' ? aDate.compare(bDate) : bDate.compare(aDate);
			}
			return 0;
		});
	});

	// Populate the tags set with the tags from the recipes
	$effect(() => {
		if (recipes.length) {
			recipes.forEach((r) => {
				if (r.tags && r.tags.length > 0) {
					if (typeof r.tags === 'string') {
						// This is to catch entries that didn't properly store tags as an array -- edge case
						commonTags.add((r.tags as string).toLowerCase());
					} else {
						r.tags.forEach((t) => {
							commonTags.add(t.toLowerCase());
						});
					}
				}
			});
		}
	});

	function getSortOrder() {
		return selectedSort;
	}

	function setSortOrder(value: string) {
		selectedSort = value;
		if (selectedSort === 'title') {
			sortDirection = 'asc';
		} else {
			sortDirection = 'desc';
		}
	}

	/** Toggle the direction of the selected sort order */
	function toggleSortDirection(event: MouseEvent) {
		event.preventDefault();
		event.stopImmediatePropagation();
		sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
	}

	/** Force sync the recipe store to the server */
	function syncRecipeStore() {
		console.log('syncRecipeStore');
	}

	/** Move a recipe to the trash */
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
	{#if $recipesStore.loading}
		<div class="absolute inset-0 grid place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{:else if $recipesStore.error}
		<div class="mx-auto grid h-screen w-full max-w-3xl place-content-center gap-6">
			<h1 class="display-medium">Ah donkey-spittle! There was a problem.</h1>
			<p class="flex items-center gap-3">
				<span class="fluid-heading-03">{$recipesStore.error.name}</span><span>|</span><span>{$recipesStore.error?.message}</span>
			</p>
		</div>
	{:else if $recipesStore.data}
		<h1 class="display-small mb-8">My Recipes</h1>
		<div class="my-12 grid w-full grid-cols-3 gap-4">
			<input
				type="text"
				class="label flex h-input w-full flex-row flex-nowrap items-stretch rounded-sm border border-gray-200 px-3 dark:border-gray-700 dark:bg-gray-900 hover:dark:bg-gray-800"
				placeholder="Search history"
				bind:value={search}
			/>
			<Select type="multiple" items={tags} bind:value={selectedTags} placeholder="Filter by tags" />
			<div class="body-medium flex h-input flex-row flex-nowrap items-stretch rounded-sm border border-border-input hover:border-border-input-hover dark:border-gray-700 bg-background dark:bg-gray-900">
				<BitsSelect.Root type="single" items={sortOptions} bind:value={getSortOrder, setSortOrder}>
					<BitsSelect.Trigger class="h-input flex-auto border-none data-placeholder:text-foreground-alt/50 inline-flex w-[296px] touch-none select-none items-center border px-input text-sm transition-colors cursor-pointer">
						<span class="body-medium text-foreground-alt/50">{selectedSort}</span>
						<span class="flex-1"></span>
						<CheveronSortIcon size="xs" />
					</BitsSelect.Trigger>
					<BitsSelect.Portal>
						<BitsSelect.Content class="focus-override border-muted bg-background shadow-popover data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 outline-hidden z-500 h-96 max-h-[var(--bits-select-content-available-height)] w-[var(--bits-select-anchor-width)] min-w-[var(--bits-select-anchor-width)] select-none rounded-xl border px-1 py-3 data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1">
							<BitsSelect.Viewport class="p-1">
								{#each sortOptions as option, i (i + option.value)}
									<BitsSelect.Item
										class="rounded-button data-highlighted:bg-muted outline-hidden data-disabled:opacity-50 flex h-10 w-full select-none items-center py-3 pl-3 pr-1.5 text-sm cursor-pointer"
										value={option.value}
										label={option.label}
									>
										{#snippet children({ selected })}
											<span class="w-min grow truncate">{option.label}</span>
											{#if selected}
												<span class="flex-none text-green-500">
													{#if sortDirection === 'asc'}
														<Button.Root class="button text narrow -mr-1" onclick={(event: MouseEvent) => toggleSortDirection(event)}>
															<ArrowUpIcon size="xs" />
														</Button.Root>
													{:else}
														<Button.Root class="button text narrow -mr-1" onclick={(event: MouseEvent) => toggleSortDirection(event)}>
															<ArrowDownIcon size="xs" />
														</Button.Root>
													{/if}
												</span>
											{/if}
										{/snippet}
									</BitsSelect.Item>
								{/each}
							</BitsSelect.Viewport>
						</BitsSelect.Content>
					</BitsSelect.Portal>
				</BitsSelect.Root>
			</div>
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
								event.preventDefault();
								event.stopImmediatePropagation();
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
