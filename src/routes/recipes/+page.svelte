<script lang="ts">
	import { savedRecipes } from '$lib/stores/recipes';
	import ListItemLink from '$lib/ui/ListItemLink.svelte';
	import { Toolbar } from 'bits-ui';
</script>

<header>
	<Toolbar.Root>
		<Toolbar.Link href="/">
			<span>Back</span>
		</Toolbar.Link>
	</Toolbar.Root>
</header>
<main>
	<h1 class="my-4 text-2xl font-bold">My Recipe Book</h1>

	{#if $savedRecipes.length > 0}
		<ul>
			{#each $savedRecipes as recipe}
				<ListItemLink href="/recipes/{recipe.id}" size="three-line">
					<p class="font-bold">{recipe.title}</p>
					<p class="text-sm">{recipe.short_description}</p>
				</ListItemLink>
			{/each}
		</ul>
	{:else}
		<p>You haven't saved any recipes yet.</p>
	{/if}
</main>
<footer></footer>
