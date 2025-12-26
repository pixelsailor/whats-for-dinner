<script lang="ts">
	import type { FullRecipe } from "$lib/api/recipe";
	import SvelteMarkdown from "@humanspeak/svelte-markdown";

  let { recipe }: { recipe: FullRecipe } = $props();

  function humanizeTime(time: string): string {
		const hours = Math.floor(parseInt(time) / 60);
		const minutes = parseInt(time) % 60;
		
		if (hours > 0) {
			return `${hours} hours ${minutes} minutes`;
		} else {
			return `${minutes} minutes`;
		}
	}
</script>

<h1 class="fluid-heading-05">{recipe.title}</h1>
<p class="my-4 italic">{recipe.description}</p>
<p class="my-4">{recipe.yield}</p>
<ul class="my-2">
  <li class="my-1">
    <span class="heading">Prep time:</span>
    {#if recipe.prep_time && recipe.prep_time.length > 1}
      <span>{humanizeTime(recipe.prep_time[0])} to {humanizeTime(recipe.prep_time[1])}</span>
    {:else}
      <span>{humanizeTime(recipe.prep_time?.[0] ?? '')}</span>
    {/if}
  </li>
  <li class="my-1">
    <span class="heading">Cooking time:</span>
    {#if recipe.cook_time && recipe.cook_time.length > 1}
      <span>{humanizeTime(recipe.cook_time[0])} to {humanizeTime(recipe.cook_time[1])}</span>
    {:else}
      <span>{humanizeTime(recipe.cook_time?.[0] ?? '')}</span>
    {/if}
  </li>
  <!-- <li class="my-1"><span class="heading">Total time:</span> <span>{recipe.total_time}</span></li> -->
</ul>
<div class="ingredients my-8">
  <h2 class="fluid-heading-03 my-2">Ingredients:</h2>
  <div class="ingredients__content markdown">
    <SvelteMarkdown source={recipe.ingredients} />
  </div>
</div>
<div class="instructions my-8">
  <h2 class="fluid-heading-03 my-2">Instructions:</h2>
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
<ul class="inline-flex gap-2 mb-4 h-12 items-center">
  {#each recipe.tags as tag}
    <li>
      <span class="tag label lowercase px-2 py-1 border rounded bg-gray-100 border-gray-200 dark:bg-gray-700 dark:border-gray-600">{tag}</span>
    </li>
  {/each}
</ul>