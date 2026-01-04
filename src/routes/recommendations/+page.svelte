<script lang="ts">
	import { onMount } from 'svelte';
	import { Button } from 'bits-ui';

	import type { SavedRecipe } from '$lib/api/recipe';
	import { db } from '$lib/db';
	import { getMealContext } from '$lib/getMealContext';
	import { AppBar } from '$lib/ui/AppBar';
	// import Button from '$lib/ui/Button/Button.svelte';
	// import { List, ListItem } from '$lib/ui/List';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
	import toMillis from '$lib/utils/toMilliseconds';

	interface RecipeCategory {
		id: string;
		title: string;
		recipes: SavedRecipe[];
	}

	let categories = $state<RecipeCategory[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let currentMealContext = $state(getMealContext());

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
		const mealType = getMealContext();

		// Filter out deleted recipes
		const activeRecipes = recipes.filter(r => !r.deleted_at && r.is_current);

		// Helper function to filter recipes by meal context
		function filterByMealContext(recipes: SavedRecipe[]): SavedRecipe[] {
			// First try to find recipes with matching meal tags
			const contextualMatches = recipes.filter(r => 
				r.tags?.some(tag => tag.toLowerCase() === mealType)
			);
			
			// If we have contextual matches, return them
			if (contextualMatches.length > 0) {
				return contextualMatches;
			}
			
			// Otherwise, return all recipes (no meal filtering)
			return recipes;
		}

		// Favorites (contextual)
		const favoriteRecipes = activeRecipes.filter(r => r.is_favorite);
		const favorites = shuffleAndTake(
			filterByMealContext(favoriteRecipes),
			8
		);

		// Recently Added (last 30 days, contextual)
		const recentlyAddedRecipes = activeRecipes.filter(r => {
			const daysSinceCreated = (now - toMillis(r.created_at ?? '')) / msPerDay;
			return daysSinceCreated <= 30;
		});
		const recentlyAdded = shuffleAndTake(
			filterByMealContext(recentlyAddedRecipes),
			8
		);

		// Most Popular in Last Month (recipes opened in last 30 days, contextual)
		const lastMonth = now - (30 * msPerDay);
		const popularLastMonthRecipes = activeRecipes.filter(r => toMillis(r.last_opened ?? '') >= lastMonth);
		const popularLastMonth = shuffleAndTake(
			filterByMealContext(popularLastMonthRecipes),
			8
		);

		// Haven't made in 2 months (but not in the never made category, contextual)
		const notMadeIn2MonthsRecipes = activeRecipes.filter(r => {
			const hasBeenOpened = r.last_opened && toMillis(r.last_opened ?? '') > 0;
			return hasBeenOpened && toMillis(r.last_opened ?? '') < twoMonthsAgo;
		});
		const notMadeIn2Months = shuffleAndTake(
			filterByMealContext(notMadeIn2MonthsRecipes),
			8
		);

		// Haven't made in over 6 months (but not in the never made category, contextual)
		const notMadeIn6MonthsRecipes = activeRecipes.filter(r => {
			const hasBeenOpened = r.last_opened && toMillis(r.last_opened ?? '') > 0;
			return hasBeenOpened && toMillis(r.last_opened ?? '') < sixMonthsAgo;
		});
		const notMadeIn6Months = shuffleAndTake(
			filterByMealContext(notMadeIn6MonthsRecipes),
			8
		);

		// Never made (never opened, contextual)
		const neverMadeRecipes = activeRecipes.filter(r => !r.last_opened || toMillis(r.last_opened ?? '') === 0);
		const neverMade = shuffleAndTake(
			filterByMealContext(neverMadeRecipes),
			8
		);

		return [
			{ id: 'favorites', title: 'Favorites', recipes: favorites },
			{ id: 'recently-added', title: 'Recently Added', recipes: recentlyAdded },
			{ id: 'popular-last-month', title: 'Most Popular in Last Month', recipes: popularLastMonth },
			{ id: 'not-made-2-months', title: "Haven't Made in 2 Months", recipes: notMadeIn2Months },
			{ id: 'not-made-6-months', title: "Haven't Made in Over 6 Months", recipes: notMadeIn6Months },
			{ id: 'never-made', title: 'Never Made', recipes: neverMade }
		].filter(category => category.recipes.length > 0); // Hide empty categories
	}

	// Load and categorize recipes
	async function loadRecommendations() {
		try {
			loading = true;
			// Refresh meal context in case time has changed
			currentMealContext = getMealContext();
			const allRecipes = await db.recipes.toArray();
			categories = categorizeRecipes(allRecipes);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load recommendations';
		} finally {
			loading = false;
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
		<AppBar.Text primary="Recommendations" />
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
		{#if categories.length === 0}
			<div class="max-w-5xl w-full flex-1">
				<div class="py-24 text-center">
					<h1 class="display-medium mb-4">No Recommendations Available</h1>
					<p class="body-medium mb-6">
						Start adding recipes to see personalized recommendations!
					</p>
					<Button.Root 
						href="/recipes/new" 
						class="button primary"
					>
						Add your first recipe
					</Button.Root>
				</div>
			</div>
		{:else}
			<!-- Sidebar Navigation -->
			<aside class="w-72">
				<nav class="sticky top-24">
					<h2 class="title-large mb-4">Categories</h2>
					<div class="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-sm">
						<p class="helper-text text-gray-600 dark:text-gray-400">
							Showing {currentMealContext} recipes based on current time. 
							Recipes without meal tags are included as fallback.
						</p>
					</div>
					<ul class="space-y-2">
						{#each categories as category}
							<li>
								<button
									class="w-full text-left px-3 py-2 rounded-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
									onclick={() => scrollToCategory(category.id)}
								>
									{category.title}
									<span class="text-sm text-gray-500 dark:text-gray-400 ml-2">
										({category.recipes.length})
									</span>
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
					<div class="flex items-center gap-2">
						<span class="text-sm text-gray-500 dark:text-gray-400">Currently showing:</span>
						<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
							{currentMealContext} recipes
						</span>
					</div>
				</div>
				{#each categories as category}
					<section id={category.id} class="mb-12 scroll-mt-8">
						<div class="flex items-center justify-between mb-6">
							<h2 class="title-large">{category.title}</h2>
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
	{/if}
</div>
