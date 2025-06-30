<script lang="ts">
	import type { FullRecipe } from "$lib/types";
	import SvelteMarkdown from "@humanspeak/svelte-markdown";

  let { recipe }: { recipe: FullRecipe } = $props();

  let recipeTime = $derived.by(() => {
		if (recipe?.time) {
			return new Map(Object.entries(recipe.time));
		}
		return undefined;
	});
</script>

<ul class="inline-flex gap-2 mb-4">
  {#each recipe.tags as tag}
    <li>
      <span class="tag label px-1 border rounded bg-gray-200 dark:bg-gray-600">{tag}</span>
    </li>
  {/each}
</ul>
<h1 class="fluid-heading-05">{recipe.title}</h1>
<p class="my-4 italic">{recipe.description}</p>
<p class="my-4">{recipe.yield}</p>
{#if recipeTime}
  <ul class="my-2">
    {#each recipeTime as time}
      <li class="my-1"><span class="heading">{time[0]} time:</span> <span>{time[1]}</span></li>
    {/each}
  </ul>
{:else}
  <p><span class="heading">Time:</span> {recipe.estimated_time}</p>
{/if}
<div class="ingredients my-8">
  <h2 class="fluid-heading-03 my-2">Ingredients:</h2>
  <div class="ingredients__content markdown">
    <SvelteMarkdown source={recipe.ingredients} />
  </div>
</div>
<div class="instructions my-8">
  <h2 class="fluid-heading-03 my-2">Preparation:</h2>
  <div class="instructions__content markdown">
    <SvelteMarkdown source={recipe.instructions} />
  </div>
</div>
{#if recipe.notes?.length}
  <div class="notes my-8">
    <h2 class="fluid-heading-03 my-2">Notes:</h2>
    <div class="notes__content markdown">
      <SvelteMarkdown source={recipe.notes} />
    </div>
  </div>
{/if}