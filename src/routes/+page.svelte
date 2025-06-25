<script lang="ts">
  import { v4 as uuid } from 'uuid';
	import { enhance } from '$app/forms';
	import { recipesApiPostHandler } from '$lib/api';
	import { db } from '$lib/db.js';
	import type { FullRecipe, RecipeSummary } from '$lib/types';
	import { onMount } from 'svelte';

	let { data, form } = $props();

	let app = $state({
		input: '',
    lastInput: '',
		view: 'idle' as 'idle' | 'detail' | 'suggestions' | 'loading' | 'error',
		suggestions: [] as RecipeSummary[],
		selected: null as RecipeSummary | null,
		fullRecipes: new Map<string, FullRecipe>(),
    error: '',
    saveStatus: 'idle' as 'idle' | 'saving' | 'saved' | 'error'
	});

	let loading = $state(false);
  let fullRecipe = $derived(app.selected ? app.fullRecipes.get(app.selected.title) : undefined);

  let alert = $state({
    type: '' as 'info' | 'warn' | 'danger' | 'success' | 'error',
    message: ''
  });

  let recipebookTitles = $state<string[]>([]);

  let isSavedRecipe = $derived(app.selected ? recipebookTitles.includes(app.selected.title) : false);

	function selectRecipe(recipe: RecipeSummary) {
		app.selected = recipe;

		// Already fetched? Use cache
		if (app.fullRecipes.has(recipe.title)) {
			app.view = 'detail';
			return;
		}

		app.view = 'loading';

		recipesApiPostHandler<FullRecipe>('detail', recipe).then((res) => {
			if (res.success) {
				app.fullRecipes.set(recipe.title, res.data);
				app.view = 'detail';
			} else {
        app.error = typeof res.error !== 'string' ? res.error.message : res.error;
        app.view = 'error';
      }
		});
	}

  /**
   * Save to the User's recipe book
   * @param title - Title of the recipe
   */
  async function saveRecipe(title: string) {
    const recipe = fullRecipe || app.fullRecipes.get(title);
    if (!recipe) return;

    app.saveStatus = 'saving';

    try {
      if (!recipebookTitles.includes(title)) {
        await db.recipes.put({
          ...recipe,
          id: uuid(),
          created_at: Date.now()
        });
        recipebookTitles.push(recipe.title);
        app.saveStatus = 'saved';
      } else {
        app.saveStatus = 'idle';
        alert.type = 'warn';
        alert.message = 'Recipe already saved';
      }
    } catch (err) {
      console.error('Save failed', err);
      app.saveStatus = 'error';
      alert.type = 'error';
      alert.message = 'Failed to save recipe';
    }
  }

  // function getSuggestions(getMore = false) {
  //   if (!app.input.trim()) return;
  //   app.view = 'loading';

  //   // Avoid duplicate requests
  //   if (app.suggestions.length > 0 && app.lastInput == app.input) {
  //     app.view = 'suggestions';
  //     return;
  //   }

  //   if (getMore) {
  //     app.input += ' give me more ideas';
  //     app.suggestions = [];
  //   }

  //   postApi<RecipeSummary[]>('suggestions', app.input).then((res) => {
  //     if (res.success) {
  //       app.suggestions = res.data;
  //       app.lastInput = app.input;
  //       app.view = 'suggestions';
  //     }
  //   })
  // }

  function backToSuggestions() {
    app.view = 'suggestions';
    app.selected = null;
  }

  // Create a list of titles to reference to avoid adding duplicates
  onMount(async () => {
    const all = await db.recipes.toArray();
    recipebookTitles = all.map((recipe) => recipe.title);
  });
</script>

{#if app.view === 'idle'}
	<h1 class="my-4 text-2xl font-bold">What are you hungry for?</h1>

	<form
		method="POST"
		use:enhance={({ formElement, formData, action, cancel, submitter }) => {
			loading = true;
			return async ({ result, update }) => {
        // console.log('form result', result);
        loading = false;
        app.lastInput = app.input;
        app.view = 'suggestions';
				await update();
			};
		}}
	>
		<input type="text" name="input" bind:value={app.input} class="w-full rounded border p-2" />
		<button
			class="rounded bg-green-600 px-4 py-2 text-white"
			type="submit"
			disabled={loading || !app.input.trim()}
		>
			{loading ? 'Thinking...' : 'Get ideas'}
		</button>
	</form>
	<!-- <form>
		<input type="text" name="request" bind:value={app.input} class="w-full rounded border p-2" />
		<button
			class="rounded bg-green-600 px-4 py-2 text-white"
			onclick={() => getSuggestions()}
			disabled={!app.input.trim()}
		>
			Get ideas
		</button>
	</form> -->
{:else if app.view === 'loading'}
  <p>Loading...</p>
{:else if app.view === 'suggestions' && form}
	<div class="response">
		<h2 class="my-4">Here are some ideas:</h2>
		<ul class="my-4">
			{#each form.data as suggestion}
				<li class="h-18">
					<button
						class="h-full w-full overflow-hidden py-2 text-left"
						onclick={() => selectRecipe(suggestion)}
					>
						<p class="font-bold">{suggestion.title}</p>
						<p class="text-sm">{suggestion.short_description}</p>
					</button>
				</li>
			{/each}
		</ul>
    <!-- <button onclick={() => getSuggestions(true)}>Give me more ideas</button> -->
	</div>
{:else if app.view === 'detail'}
	<div>
		<button onclick={backToSuggestions}>Back to suggestions</button>
	</div>

	<h1 class="my-2 text-lg font-bold">{app.selected?.title}</h1>
  {#if fullRecipe}
    <p class="my-4 italic">{fullRecipe.description}</p>
    <p><span class="font-bold">Time:</span> {fullRecipe.estimated_time}</p>
    <ul class="my-4">
      {#each fullRecipe.ingredients as item}
        <li>{item}</li>
      {/each}
    </ul>
    <ol class="my-4">
      {#each fullRecipe.instructions as step}
        <li>{step}</li>
      {/each}
    </ol>
    <div class="my-8">
      <button
        class={[
          'mt-4 px-4 py-2 rounded text-white',
          {'bg-green-600': app.saveStatus === 'saved'},
          {'bg-gray-600': app.saveStatus === 'saving'},
          {'bg-blue-600': app.saveStatus === 'idle'}
        ]}
        disabled={app.saveStatus === 'saving' || isSavedRecipe}
	      onclick={() => saveRecipe(fullRecipe.title)}
      >
        {#if app.saveStatus === 'saving'}
          Saving...
        {:else if app.saveStatus === 'saved' || isSavedRecipe}
          Saved
        {:else}
          Add to my recipe book
        {/if}
      </button>
    </div>
  {:else}
    <p>Loading recipe...</p>
  {/if}
{:else if app.view === 'error'}
	<div class="error">
		<p class="font-bold my-4">Ah donkeyspittle! There was a problem.</p>
		<p>{app.error}</p>
    <button onclick={backToSuggestions}>Back to suggestions</button>
	</div>
{/if}

{#if form?.error}
	<div class="error">
		<h2>Error:</h2>
		<p>{form.error}</p>
	</div>
{/if}