<script lang="ts">
	import { onMount } from 'svelte';
	import { Button, Toggle } from 'bits-ui';

	import type { SavedRecipe } from '$lib/api/recipe';
	import { db } from '$lib/db';
	import { getMealContext } from '$lib/getMealContext';
	import { AppBar } from '$lib/ui/AppBar';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import toMillis from '$lib/utils/toMilliseconds';
	import { recipes as recipesStore } from '$lib/stores/recipes';
	import { sentenceCase } from '$lib/utils';

	interface RecipeCategory {
		id: string;
		title: string;
		recipes: SavedRecipe[];
	}

	let recipes = $derived<SavedRecipe[]>($recipesStore.data ?? []);
	let loading = $derived($recipesStore.loading);
	let error = $derived($recipesStore.error);

	let categories = $state<RecipeCategory[]>([]);

	let currentMealContext = $state(getMealContext());

	let useMealContext = $state(true);

	$effect(() => {
		categories = categorizeRecipes(recipes);
	})

	// Helper function to calculate days since last opened
	function daysSinceLastOpened(lastOpened: number): number {
		const msPerDay = 1000 * 60 * 60 * 24;
		return Math.floor((Date.now() - lastOpened) / msPerDay);
	}

	// Helper function to shuffle array and take first n items
	function shuffleAndTake<T>(array: T[], count: number): T[] {
		const shuffled = [...array].sort(() => Math.random() - 0.5);
		return shuffled.slice(0, count);
	}

	// Categorize recipes
	function categorizeRecipes(recipes: SavedRecipe[]): RecipeCategory[] {
		const now = Date.now();
		const msPerDay = 1000 * 60 * 60 * 24;
		const twoMonthsAgo = now - (60 * msPerDay);
		const sixMonthsAgo = now - (180 * msPerDay);

		// Helper function to filter recipes by meal context
		function filterByMealContext(recipes: SavedRecipe[]): SavedRecipe[] {
			if (useMealContext) {
				return recipes.filter(r => 
					r.tags?.some(tag => tag.toLowerCase() === currentMealContext?.toLowerCase())
				);
			}
			return recipes;
		}

		// Favorites (contextual)
		const favoriteRecipes = recipes.filter(r => r.is_favorite);
		const favorites = shuffleAndTake(
			filterByMealContext(favoriteRecipes),
			8
		);

		// Recently Added (last 30 days, contextual)
		const recentlyAddedRecipes = recipes.filter(r => {
			const daysSinceCreated = (now - toMillis(r.created_at ?? '')) / msPerDay;
			return daysSinceCreated <= 30;
		});
		const recentlyAdded = shuffleAndTake(
			filterByMealContext(recentlyAddedRecipes),
			8
		);

		// Most Popular in Last Month (recipes opened in last 30 days, contextual)
		const lastMonth = now - (30 * msPerDay);
		const popularLastMonthRecipes = recipes.filter(r => r.checkout_history?.some(date => toMillis(date) >= lastMonth));
		const popularLastMonth = shuffleAndTake(
			filterByMealContext(popularLastMonthRecipes),
			8
		);

		// Top 10 most popular all-time recipes
		const mostPopularAllTimeRecipes = recipes.sort((a, b) => (b.checkout_history?.length ?? 0) - (a.checkout_history?.length ?? 0)).slice(0, 10);
		const mostPopularAllTime = shuffleAndTake(
			filterByMealContext(mostPopularAllTimeRecipes),
			8
		);

		// Haven't made in 2 months (but not in the never made category, contextual)
		const notMadeIn2MonthsRecipes = recipes.filter(r => {
			return r.checkout_history?.some(date => toMillis(date) < twoMonthsAgo);
		});
		const notMadeIn2Months = shuffleAndTake(
			filterByMealContext(notMadeIn2MonthsRecipes),
			8
		);

		// Haven't made in over 6 months (but not in the never made category, contextual)
		const notMadeIn6MonthsRecipes = recipes.filter(r => {
			return r.checkout_history?.some(date => toMillis(date) < sixMonthsAgo);
		});
		const notMadeIn6Months = shuffleAndTake(
			filterByMealContext(notMadeIn6MonthsRecipes),
			8
		);

		// Never made (never opened, contextual)
		const neverMadeRecipes = recipes.filter(r => r.checkout_history?.length === 0);
		const neverMade = shuffleAndTake(
			filterByMealContext(neverMadeRecipes),
			8
		);

		return [
			{ id: 'favorites', title: 'Random Favorites', recipes: favorites },
			{ id: 'recently-added', title: 'Recently Added', recipes: recentlyAdded },
			{ id: 'popular-last-month', title: 'Made In The Last Month', recipes: popularLastMonth },
			{ id: 'popular-all-time', title: 'Most Popular All Time', recipes: mostPopularAllTime },
			{ id: 'not-made-2-months', title: "Haven't Made in 2 Months", recipes: notMadeIn2Months },
			{ id: 'not-made-6-months', title: "Haven't Made in Over 6 Months", recipes: notMadeIn6Months },
			{ id: 'never-made', title: 'Never Made', recipes: neverMade }
		].filter(category => category.recipes.length > 0); // Hide empty categories
	}

	// Load and categorize recipes
	async function loadRecommendations() {
		try {
			// Refresh meal context in case time has changed
			currentMealContext = getMealContext();
			const allRecipes = await db.recipes.toArray();
			categories = categorizeRecipes(allRecipes);
		} catch (err) {
			error = err instanceof Error ? err : new Error('Failed to load recommendations');
		}
	}

	// Scroll to category
	function scrollToCategory(categoryId: string) {
		const element = document.getElementById(categoryId);
		if (element) {
			element.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	onMount(() => {
		loadRecommendations();
	});
</script>

<PageHeader>
	<AppBar.Root>
		<!-- <AppBar.Text primary="Recommendations" /> -->
		<AppBar.End>
			<Button.Root
				class="button text narrow"
				onclick={loadRecommendations} 
				disabled={loading}
			>
				<span>Refresh</span>
			</Button.Root>
		</AppBar.End>
	</AppBar.Root>
</PageHeader>

<div class="flex gap-8 mx-auto max-w-5xl px-4 lg:px-8 py-8">
	{#if loading}
		<div class="mx-auto grid h-screen w-full max-w-3xl place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{:else if error}
		<div class="mx-auto grid h-screen w-full max-w-3xl place-content-center gap-6">
			<h1 class="display-medium">Ah donkey-spittle! There was a problem.</h1>
			<p class="flex items-center gap-3">
				<span class="fluid-heading-03">Error</span><span>|</span><span>{error}</span>
			</p>
		</div>
	{:else}
		<!-- Sidebar Navigation -->
		<aside class="w-72">
			<nav class="sticky top-24">
				<div class="flex flex-col gap-2 mb-6">
					<p class="label-large text-gray-500 dark:text-gray-400">Currently showing:</p>
					<Toggle.Root
						bind:pressed={useMealContext}
						class="h-input bg-background rounded-input border-border flex flex-nowrap items-stretch justify-start gap-1 border px-1 py-1"
					>
						<Button.Root onclick={() => useMealContext = false} class={['button free narrow label-medium', !useMealContext ? 'text' : 'primary cursor-default!']}>
							<span>{sentenceCase(currentMealContext ?? '')} recipes</span>
						</Button.Root>
						<Button.Root onclick={() => useMealContext = true} class={['button free narrow label-medium', useMealContext ? 'text' : 'primary cursor-default!']}>
							<span>All recipes</span>
						</Button.Root>
					</Toggle.Root>
				</div>
				<ul class="my-6">
					{#each categories as category}
						<li>
							<button
								class="button text narrow w-full justify-between"
								onclick={() => scrollToCategory(category.id)}
							>
								{category.title}
								<span class="badge subtle label-small">{category.recipes.length}</span>
							</button>
						</li>
					{/each}
				</ul>
			</nav>
		</aside>

		<!-- Main Content -->
		<div class="max-w-5xl w-full flex-1">
			<div class="mb-8">
				<h1 class="display-small mb-2">Recipe Recommendations</h1>
				<p class="body-medium mb-2">
					Discover recipes based on your cooking patterns and preferences.
				</p>
			</div>
			{#each categories as category}
				<section id={category.id} class="mb-12 scroll-mt-8">
					<div class="flex items-center justify-between mb-2">
						<h2 class="title-medium">{category.title}</h2>
						<span class="tag subtle label-medium">
							{category.recipes.length} recipe{category.recipes.length !== 1 ? 's' : ''}
						</span>
					</div>
					<div class="list">
						{#each category.recipes as recipe, index}
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
	{/if}
</div>
