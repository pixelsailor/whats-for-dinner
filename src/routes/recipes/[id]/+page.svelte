<script lang="ts">
  import { v4 as uuid } from 'uuid';

	import { page } from '$app/state';
	import { db } from '$lib/db';
	import { getSavedRecipe } from '$lib/stores/recipes';
	import type { SavedRecipe } from '$lib/types';
	import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';

	const id = $derived(page.params.id);

  let idRef = $state<HTMLElement>(); // Used to capture the resolved recipe.id

  async function saveModifieRecipe(original: SavedRecipe, updated: Partial<SavedRecipe>) {
    await db.recipes.update(original.id, { is_current: false });

    const version = original.version + 1;
    const newRecipe: SavedRecipe = {
      ...original,
      ...updated,
      id: uuid(),
      version,
      parent_id: original.parent_id ?? original.id,
      is_current: true,
      created_at: Date.now()
    };

    await db.recipes.put(newRecipe);
    return newRecipe;
  }

  $effect(() => {
    if (idRef && idRef.textContent) {
      console.log(idRef);
      const id = idRef.textContent;
      db.recipes.update(id, { last_opened: Date.now() });
    }
  })
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
      <span class="hidden" bind:this={idRef}>{recipe.id}</span>
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
