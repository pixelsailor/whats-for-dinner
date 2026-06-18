<script lang="ts">
  import { Select as BitsSelect, Label } from 'bits-ui';
  import { SvelteSet } from 'svelte/reactivity';
  import { toast } from 'svelte-sonner';

  import { afterNavigate, goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';

  import { db } from '$lib/db';
  import {
    type RecipeListSort,
    applyRecipeListFiltersToUrl,
    parseRecipeListSearchParams
  } from '$lib/recipes/recipeListFiltersUrl';
  import { recipesStore } from '$lib/stores/recipes';

  import { AppBar } from '$lib/ui/AppBar';
  import DocumentAddIcon from '$lib/ui/icons/DocumentAddIcon.svelte';
  import TrashIcon from '$lib/ui/icons/TrashIcon.svelte';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
  import Select from '$lib/ui/Select.svelte';
  import type { SelectOption } from '$lib/ui/types.js';
  import type { SavedRecipe } from '$lib/api/recipe';
  import ArrowUpIcon from '$lib/ui/icons/ArrowUpIcon.svelte';
  import ArrowDownIcon from '$lib/ui/icons/ArrowDownIcon.svelte';
  import CheveronSortIcon from '$lib/ui/icons/CheveronSortIcon.svelte';
  import Button from '$lib/ui/button.svelte';
  import TextInput from '$lib/ui/text-input/text-input.svelte';
  import toMillis from '$lib/utils/toMilliseconds';

  /** Milliseconds for last checkout; `0` matches never-made / unparseable (same baseline as old epoch fallback). */
  function lastCheckoutMillis(raw: string | undefined): number {
    if (raw == null || raw === '') return 0;
    const ms = toMillis(raw);
    return ms === -1 ? 0 : ms;
  }

  // let { data } = $props();

  let recipes = $derived<SavedRecipe[]>($recipesStore.data ?? []);

  const commonTags = new SvelteSet<string>();

  let tags = $derived.by<SelectOption[]>(
    () => Array.from(commonTags).map((t) => ({ value: t, label: t })) || []
  );

  let selectedTags = $state<string[]>([]);

  let search = $state<string>();

  let sortOptions = $state<SelectOption[]>([
    { value: 'title', label: 'Title' },
    { value: 'created_at', label: 'Created' },
    { value: 'last_made', label: 'Last made' }
  ]);
  let selectedSort = $state<RecipeListSort>('title');
  let sortDirection = $state<'asc' | 'desc'>('asc');
  let selectedSortLabel = $derived.by(() => {
    let options = {
      title: 'Title',
      created_at: 'Created',
      last_made: 'Last made'
    };
    return options[selectedSort] || selectedSort;
  });

  const recipesListPath = resolve('/recipes');

  function applyFiltersFromUrl(searchParams: URLSearchParams): void {
    const parsed = parseRecipeListSearchParams(searchParams);
    search = parsed.search;
    selectedTags = parsed.tags;
    selectedSort = parsed.sort;
    sortDirection = parsed.dir;
  }

  function syncFiltersToUrl(): void {
    const next = applyRecipeListFiltersToUrl(page.url, {
      search,
      tags: selectedTags,
      sort: selectedSort,
      dir: sortDirection
    });
    if (next.pathname !== recipesListPath) return;
    const target = `${recipesListPath}${next.search}`;
    const current = `${page.url.pathname}${page.url.search}`;
    if (target === current) return;
    // eslint-disable-next-line svelte/no-navigation-without-resolve -- query string appended to resolve('/recipes')
    goto(`${resolve('/recipes')}${next.search}`, {
      replaceState: true,
      noScroll: true
    });
  }

  afterNavigate(({ to }) => {
    if (!to) return;
    if (to.url.pathname !== recipesListPath) return;
    applyFiltersFromUrl(to.url.searchParams);
  });

  // Suggestions filtered by search and tags
  let filteredRecipes = $derived.by(() => {
    if (!recipes.length) return [];

    const titleSearch = search?.toLowerCase().trim() || '';
    const hasSearch = Boolean(search && search.length > 1);
    const hasFilters = selectedTags && selectedTags.length > 0;

    return recipes
      .filter((r) => {
        const searchMatches =
          !hasSearch || r.title.toLowerCase().includes(titleSearch);
        const tagMatches =
          !hasFilters ||
          selectedTags.every((t) =>
            r.tags.map((t) => t.toLowerCase()).includes(t.toLowerCase())
          );
        return searchMatches && tagMatches;
      })
      .sort((a, b) => {
        if (selectedSort === 'title') {
          return sortDirection === 'asc'
            ? a.title.localeCompare(b.title)
            : b.title.localeCompare(a.title);
        }
        if (selectedSort === 'created_at') {
          return sortDirection === 'asc'
            ? a.created_at.localeCompare(b.created_at)
            : b.created_at.localeCompare(a.created_at);
        }
        if (selectedSort === 'last_made') {
          const aMs = lastCheckoutMillis(a.checkout_history?.at(-1));
          const bMs = lastCheckoutMillis(b.checkout_history?.at(-1));
          return sortDirection === 'asc' ? aMs - bMs : bMs - aMs;
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
    if (value !== 'title' && value !== 'created_at' && value !== 'last_made')
      return;
    selectedSort = value;
    if (selectedSort === 'title') {
      sortDirection = 'asc';
    } else {
      sortDirection = 'desc';
    }
    syncFiltersToUrl();
  }

  /** Toggle the direction of the selected sort order */
  function toggleSortDirection(event: MouseEvent) {
    event.preventDefault();
    event.stopImmediatePropagation();
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    syncFiltersToUrl();
  }

  /** Force sync the recipe store to the server */
  // function syncRecipeStore() {
  //   console.log('syncRecipeStore');
  // }

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

<svelte:head>
  <title>What's for dinner? | My Recipes</title>
</svelte:head>

<PageHeader>
  <AppBar.Root>
    <AppBar.Text primary="My Recipes" />
    <AppBar.End>
      <Button href="/recipes/new" aria-label="Add a recipe" class="text narrow">
        <DocumentAddIcon size="xs" />
        <span class="hidden md:inline">Add a recipe</span>
      </Button>
      <Button
        href="/recipes/trash"
        aria-label="Open trash"
        class="text icon"
        tooltip="Open trash"
      >
        <TrashIcon size="xs" />
      </Button>
      <!-- {#if data.session}
				<PxlIconButton onClick={syncRecipeStore} aria-label="Sync recipes" tooltip="Sync recipes">
					<CloudBackupIcon size="xs" />
				</PxlIconButton>
			{/if} -->
    </AppBar.End>
  </AppBar.Root>
</PageHeader>

<div class="mx-auto max-w-5xl px-4 py-8 lg:px-8">
  {#if $recipesStore.loading}
    <div class="absolute inset-0 grid place-content-center">
      <ProgressSpinner size="lg" />
    </div>
  {:else if $recipesStore.error}
    <div
      class="mx-auto grid h-screen w-full max-w-3xl place-content-center gap-6"
    >
      <h1 class="display-medium">Ah donkey-spittle! There was a problem.</h1>
      <p class="flex items-center gap-3">
        <span class="fluid-heading-03">{$recipesStore.error.name}</span><span
          >|</span
        ><span>{$recipesStore.error?.message}</span>
      </p>
    </div>
  {:else if $recipesStore.data}
    <h1 class="display-small mb-12">My Recipes</h1>
    <div class="my-4 grid w-full grid-cols-3 gap-4">
      <TextInput
        name="keyword-search"
        labelText="Search titles"
        bind:value={search}
        onblur={syncFiltersToUrl}
      />
      <div class="form-field">
        <Label.Root for="tag-filter" class="label-large"
          >Filter by tags</Label.Root
        >
        <Select
          type="multiple"
          id="tag-filter"
          items={tags}
          bind:value={selectedTags}
          onValueChange={syncFiltersToUrl}
        />
      </div>
      <div class="form-field">
        <Label.Root for="sort-order" class="label-large">Sort by</Label.Root>
        <div
          class="body-medium textinput textinput--outlined p-0! flex flex-row flex-nowrap items-stretch"
        >
          <BitsSelect.Root
            type="single"
            items={sortOptions}
            bind:value={getSortOrder, setSortOrder}
          >
            <BitsSelect.Trigger
              class="textinput textinput--outlined body-medium h-input-mobile md:h-input bg-input data-placeholder:text-placeholder px-input inline-flex w-[296px] flex-auto cursor-pointer touch-none items-center border border-none text-sm transition-colors select-none"
            >
              <span class="body-medium">{selectedSortLabel}</span>
              <span class="flex-1"></span>
              <CheveronSortIcon size="xs" />
            </BitsSelect.Trigger>
            <BitsSelect.Portal>
              <BitsSelect.Content
                class={[
                  'focus-override',
                  'bg-popover',
                  'backdrop-blur-xs',
                  'shadow-popover',
                  'rounded-popover',
                  'border',
                  'border-muted',
                  'data-[state=open]:animate-in',
                  'data-[state=closed]:animate-out',
                  'data-[state=closed]:fade-out-0',
                  'data-[state=open]:fade-in-0',
                  'data-[state=closed]:zoom-out-95',
                  'data-[state=open]:zoom-in-95',
                  'data-[side=bottom]:slide-in-from-top-2',
                  'data-[side=left]:slide-in-from-right-2',
                  'data-[side=right]:slide-in-from-left-2',
                  'data-[side=top]:slide-in-from-bottom-2',
                  'z-500',
                  'h-96',
                  'max-h-[var(--bits-select-content-available-height)]',
                  'w-[var(--bits-select-anchor-width)]',
                  'min-w-[var(--bits-select-anchor-width)]',
                  'px-1',
                  'py-3',
                  'outline-hidden',
                  'select-none',
                  'data-[side=bottom]:translate-y-1',
                  'data-[side=left]:-translate-x-1',
                  'data-[side=right]:translate-x-1',
                  'data-[side=top]:-translate-y-1'
                ]}
              >
                <BitsSelect.Viewport class="p-1">
                  {#each sortOptions as option, i (i + option.value)}
                    <BitsSelect.Item
                      class="rounded data-highlighted:bg-dark-04 flex h-input-mobile md:h-input w-full cursor-pointer items-center py-3 pr-1.5 pl-3 text-sm outline-hidden select-none data-disabled:opacity-50"
                      value={option.value}
                      label={option.label}
                    >
                      {#snippet children({ selected })}
                        <span class="w-min grow truncate">{option.label}</span>
                        {#if selected}
                          <span class="flex-none text-green-500">
                            {#if sortDirection === 'asc'}
                              <Button
                                class="text narrow -mr-1"
                                onclick={(event: MouseEvent) =>
                                  toggleSortDirection(event)}
                              >
                                <ArrowUpIcon size="xs" />
                              </Button>
                            {:else}
                              <Button
                                class="text narrow -mr-1"
                                onclick={(event: MouseEvent) =>
                                  toggleSortDirection(event)}
                              >
                                <ArrowDownIcon size="xs" />
                              </Button>
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
    </div>
    {#if filteredRecipes.length === 0}
      <div class="flex flex-col items-center justify-center gap-4">
        <p>You don't have any recipes that match your search.</p>
        <Button href="/recipes/new">Add a new recipe</Button>
      </div>
    {/if}
    <div class="list">
      {#each filteredRecipes! as recipe (recipe.id)}
        <hr />
        <Button href="/recipes/{recipe.id}" class="listitem text narrow">
          <span class="listitem__content">
            <span class="title-medium">{recipe.title}</span>
            <span class="body-medium text-foreground-alt"
              >{recipe.short_description}</span
            >
          </span>
          <span class="listitem__end">
            <Button
              class="text icon"
              aria-label="Delete recipe"
              tooltip="Delete recipe"
              onclick={(event: MouseEvent) => {
                event.preventDefault();
                event.stopImmediatePropagation();
                deleteRecipe(recipe.id, recipe.title);
              }}
            >
              <TrashIcon size="xs" />
            </Button>
          </span>
        </Button>
      {/each}
    </div>
  {/if}
</div>
