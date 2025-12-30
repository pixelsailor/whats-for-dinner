<script lang="ts">
	import type { Recipe } from "$lib/api/recipe";
	import SvelteMarkdown from "@humanspeak/svelte-markdown";

  let { recipe }: { recipe: Recipe } = $props();

  // Inferred total time
	let totalTime = $derived.by<string>(() => {
		const minDuration = parseInt(recipe.prep_time?.[0] ?? '0') + parseInt(recipe.cook_time?.[0] ?? '0');
		const maxDuration = parseInt(recipe.prep_time?.[1] ?? '0') + parseInt(recipe.cook_time?.[1] ?? '0');

		if (maxDuration > 0) {
      return humanizeTime([minDuration.toString(), maxDuration.toString()]);
		} else {
			return humanizeTime([minDuration.toString()]);
		}
	});

  /**
   * Determines how to interpret a time range returning either a hyphen or 'to' separator
   * @param time - The time range to interpret
   */
  function humanizeTime(time: string[]): string {
    if (!time || time.length === 0) return '';
    if (time.length === 1) {
      return humanizeDuration(parseInt(time[0]));
    } else {
      if (parseInt(time[1]) < 60) {
        return humanizeDuration(parseInt(time[0]), false) + '-' + humanizeDuration(parseInt(time[1]));
      } else {
        return humanizeDuration(parseInt(time[0])) + ' to ' + humanizeDuration(parseInt(time[1]));
      }
    }
  }

	/** Renders a duration in the format of "X hours Y minutes" or "Y minutes" */
	function humanizeDuration(duration: number, showUnits = true): string {
		const hours = Math.floor(duration / 60);
		const minutes = duration % 60;
		if (hours > 0) {
			return `${hours} ${hours === 1 ? 'hours' : 'hour'} ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
		} else {
      if (showUnits) {
        return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
      } else {
        return minutes.toString();
      }
		}
	}
</script>

<h1 class="fluid-heading-05">{recipe.title}</h1>
<p class="my-4 italic">{recipe.description}</p>
<p class="my-4">{recipe.yield}</p>
<div class="grid grid-cols-[6rem_minmax(0,1fr)] gap-1 align-baseline my-2">
  <span class="heading">Prep time:</span>
  <span>{humanizeTime(recipe.prep_time)}</span>
  <span class="heading">Cook time:</span>
  <span>{humanizeTime(recipe.cook_time)}</span>
  <span class="heading">Total time:</span><span>{totalTime}</span>
</div>
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