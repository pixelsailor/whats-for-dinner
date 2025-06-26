<script lang="ts">
	import { page } from '$app/state';
	import { getSavedRecipe } from '$lib/stores/recipes';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';

	const id = $derived(page.params.id);
</script>

<header></header>
<main class="px-4">
	{#await getSavedRecipe(id)}
		<div class="absolute inset-0 grid place-content-center">
			<ProgressSpinner size="lg" />
		</div>
	{:then recipe}
    {#if recipe}
      <h1 class="my-4 text-xl font-bold">{recipe.title}</h1>
      <p class="my-4 italic">{recipe.description}</p>
      <p><span class="font-bold">Time:</span> {recipe.estimated_time}</p>
      <ul class="my-4 ml-6 list-disc">
        {#each recipe.ingredients as item}
          <li>{item}</li>
        {/each}
      </ul>
      <ol class="my-4 ml-6 list-decimal">
        {#each recipe.instructions as step}
          <li>{step}</li>
        {/each}
      </ol>
    {:else}
      <h1>Ah, donkeyspittle!</h1>
      <p>A recipe matching the provided ID could not be found.</p>
    {/if}
	{/await}
</main>
