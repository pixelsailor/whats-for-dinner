<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { recommendedRecipes } from '$lib/stores/recommendations.js';
	import type { RecipeSummary, Suggestion } from '$lib/types';
	import { AppBar } from '$lib/ui/AppBar/index.js';
	import Button from '$lib/ui/Button/Button.svelte';
	import TrashIcon from '$lib/ui/Icons/TrashIcon.svelte';
	import { List, ListItem } from '$lib/ui/List';
	import PageHeader from '$lib/ui/PageHeader.svelte';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';

</script>

<!-- <PageHeader>
	<AppBar.Root>
		<AppBar.End>
			<Button onClick={() => bulkDeleteSuggestions()} size="sm">
				<TrashIcon size="xs" />
				<span class="hidden md:inline">Delete all</span>
			</Button>
		</AppBar.End>
	</AppBar.Root>
</PageHeader> -->

<main class="mx-auto min-h-screen max-w-5xl px-4">
	{#if $recommendedRecipes.error}
		<div class="mx-auto grid h-screen w-full max-w-3xl place-content-center gap-6">
			<h1 class="fluid-heading-05">Ah donkey-spittle! There was a problem.</h1>
			<p class="flex items-center gap-3">
				<span class="fluid-heading-03">{$recommendedRecipes.error.name}</span><span>|</span><span
					>{$recommendedRecipes.error?.message}</span
				>
			</p>
		</div>
	{:else if $recommendedRecipes.data}
		<div class="py-24">
			<h1 class="fluid-heading-04 mb-8">Here's some recipes you haven't made in a while.</h1>
			<ul>
				{#each $recommendedRecipes.data as summary}
					<li>
						<a
							data-sveltekit-preload-data="tap"
							href={`/recipes/${encodeURIComponent(summary.id)}`}
							aria-label={summary.title ?? 'Recipe'}
							class="flex flex-col py-3"
						>
							<span class="heading">{summary.title}</span>
							<p>{summary.short_description}</p>
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div class="mx-auto grid h-screen w-full max-w-3xl place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{/if}
</main>
