<script lang="ts">
  import type { Recipe, Suggestion } from '$lib/api/recipe';
  import SvelteMarkdown from '@humanspeak/svelte-markdown';

  let { recipe }: { recipe: Recipe | Suggestion } = $props();

  // Inferred total time
  let totalTime = $derived.by<string>(() => {
    const minDuration =
      parseInt(recipe.prep_time?.[0] ?? '0') +
      parseInt(recipe.cook_time?.[0] ?? '0');
    const maxDuration =
      parseInt(recipe.prep_time?.[1] ?? '0') +
      parseInt(recipe.cook_time?.[1] ?? '0');

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
        return (
          humanizeDuration(parseInt(time[0]), false) +
          '-' +
          humanizeDuration(parseInt(time[1]))
        );
      } else {
        return (
          humanizeDuration(parseInt(time[0])) +
          ' to ' +
          humanizeDuration(parseInt(time[1]))
        );
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

<h1 class="display-small">{recipe.title}</h1>
<p class="body-large my-4 italic">{recipe.description}</p>
<p class="my-4">{recipe.yield}</p>
<div class="my-2 grid grid-cols-[5rem_minmax(0,1fr)] gap-1 align-baseline">
  <span class="label-large">Prep time:</span>
  <span class="body-medium">{humanizeTime(recipe.prep_time ?? [])}</span>
  <span class="label-large">Cook time:</span>
  <span class="body-medium">{humanizeTime(recipe.cook_time ?? [])}</span>
  <span class="label-large">Total time:</span><span class="body-medium"
    >{totalTime}</span
  >
</div>
<div class="ingredients my-8">
  <h2 class="title-large my-2">Ingredients:</h2>
  <div class="ingredients__content markdown">
    <SvelteMarkdown source={recipe.ingredients ?? ''} />
  </div>
</div>
<div class="instructions my-8">
  <h2 class="title-large my-2">Instructions:</h2>
  <div class="instructions__content markdown">
    <SvelteMarkdown source={recipe.instructions ?? ''} />
  </div>
</div>
{#if recipe.notes?.length}
  <div class="notes my-8">
    <h2 class="title-large my-2">Notes:</h2>
    <div class="notes__content markdown">
      <SvelteMarkdown source={recipe.notes ?? ''} />
    </div>
  </div>
{/if}
<ul class="mb-4 inline-flex h-12 items-center gap-2">
  {#each recipe.tags as tag, index (index)}
    <li>
      <span class="tag label-medium lowercase">{tag}</span>
    </li>
  {/each}
</ul>
