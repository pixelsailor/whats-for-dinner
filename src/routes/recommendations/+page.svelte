<script lang="ts">
  import { Button, Toggle } from 'bits-ui';

  import type { SavedRecipe } from '$lib/api/recipe';
  import { getMealContext } from '$lib/getMealContext';
  import { categorizeRecipes } from '$lib/recommendations/recommendations';
  import type { RecommendationCategory } from '$lib/recommendations/recommendations';
  import { AppBar } from '$lib/ui/AppBar';
  import PageHeader from '$lib/ui/PageHeader.svelte';
  import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
  import { unsortedRecipesStore } from '$lib/stores/recipes';
  import { sentenceCase } from '$lib/utils';

  let recipes = $derived<SavedRecipe[]>($unsortedRecipesStore.data ?? []);
  let loading = $derived($unsortedRecipesStore.loading);
  let storeError = $derived($unsortedRecipesStore.error);

  let currentMealContext = $state<ReturnType<typeof getMealContext>>(getMealContext());

  let useMealContext = $state(true);

  let categories = $derived<RecommendationCategory[]>(
    categorizeRecipes(recipes, {
      mealTag: currentMealContext,
      useMealContext
    })
  );

  function refreshRecommendations() {
    currentMealContext = getMealContext();
  }

  // Scroll to category
  function scrollToCategory(categoryId: string) {
    const element = document.getElementById(categoryId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
</script>

<div class="grid" style:height={$unsortedRecipesStore.data ? 'auto' : '100vh'} style:place-content={$unsortedRecipesStore.data ? 'start stretch' : 'center'}>
  {#if loading}
    <ProgressSpinner size="lg" />
  {:else if storeError}
    <div class="flex max-w-3xl flex-col gap-6">
      <h1 class="display-medium">Ah donkey-spittle! There was a problem.</h1>
      <p class="flex items-center gap-3">
        <span class="fluid-heading-03">Error</span><span>|</span><span>{storeError}</span>
      </p>
    </div>
  {:else}
    <PageHeader>
      <AppBar.Root>
        <!-- <AppBar.Text primary="Recommendations" /> -->
        <AppBar.End>
          <Button.Root class="button text narrow" onclick={refreshRecommendations} disabled={loading}>
            <span>Refresh</span>
          </Button.Root>
        </AppBar.End>
      </AppBar.Root>
    </PageHeader>
    <div class="mx-auto flex w-full max-w-7xl gap-8 px-4 py-8 lg:px-8">
      <!-- Main Content -->
      <div class="w-full max-w-5xl flex-1">
        <div class="mb-8">
          <h1 class="display-small mb-2">Recipe Recommendations</h1>
          <p class="body-medium mb-2">
            Discover recipes from your saved collection using checkout history, favorites, and meal tags. This list does not re-apply your account dietary or
            preference settings—those apply when you add recipes or use AI suggestions.
          </p>
        </div>
        {#each categories as category (category.id)}
          <section id={category.id} class="mb-12 scroll-mt-8">
            <div class="mb-2 flex items-center justify-between">
              <h2 class="title-medium">{category.title}</h2>
              <span class="tag subtle label-medium">
                {category.recipes.length} recipe{category.recipes.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div class="list">
              {#each category.recipes as recipe, index (recipe.id)}
                {#if index > 0}
                  <hr class="border-gray-200 dark:border-gray-700" />
                {/if}
                <Button.Root href="/recipes/{recipe.id}" class="listitem button text narrow">
                  <span class="listitem__content">
                    <span class="title-medium">{recipe.title}</span>
                    <span class="body-medium text-foreground-alt dark:text-foreground-alt">{recipe.short_description}</span>
                  </span>
                </Button.Root>
              {/each}
            </div>
          </section>
        {/each}
      </div>
      <!-- Sidebar Navigation -->
      <aside class="w-72">
        <nav class="sticky top-24">
          <div class="mb-6 flex flex-col gap-2">
            <p class="label-large text-gray-500 dark:text-gray-400">Currently showing:</p>
            <Toggle.Root
              bind:pressed={useMealContext}
              class="h-input bg-background rounded-input border-border flex flex-nowrap items-stretch justify-start gap-1 border px-1 py-1"
            >
              <Button.Root
                onclick={() => (useMealContext = false)}
                class={['button free narrow label-medium', !useMealContext ? 'text' : 'primary cursor-default!']}
              >
                <span>{sentenceCase(currentMealContext ?? '')} recipes</span>
              </Button.Root>
              <Button.Root
                onclick={() => (useMealContext = true)}
                class={['button free narrow label-medium', useMealContext ? 'text' : 'primary cursor-default!']}
              >
                <span>All recipes</span>
              </Button.Root>
            </Toggle.Root>
          </div>
          <ul class="my-6">
            {#each categories as category (category.id)}
              <li>
                <button class="button text narrow w-full justify-between" onclick={() => scrollToCategory(category.id)}>
                  {category.title}
                  <span class="badge subtle label-small">{category.recipes.length}</span>
                </button>
              </li>
            {/each}
          </ul>
        </nav>
      </aside>
    </div>
  {/if}
</div>
