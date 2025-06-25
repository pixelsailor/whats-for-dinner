<script lang="ts">
	import { enhance } from '$app/forms';
	import type { FullRecipe, RecipeSummary } from '$lib/types';

	let { data, form } = $props();

	let app = $state({
		input: '',
    lastInput: '',
		view: 'idle',
		suggestions: [] as RecipeSummary[],
		selected: null as RecipeSummary | null,
		fullRecipes: new Map<string, FullRecipe>()
	});

	let loading = $state(false);
  let fullRecipe = $derived(app.selected ? app.fullRecipes.get(app.selected.title) : undefined);

	async function postApi<T>(
		action: string,
		data: any
	): Promise<{ success?: boolean; error?: string; data: T; message?: string }> {
		const response = await fetch('/api/recipes', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ action, ...data })
		});

		return response.json();
	}

	function selectRecipe(recipe: RecipeSummary) {
		app.selected = recipe;

		// Already fetched? Use cache
		if (app.fullRecipes.has(recipe.title)) {
			app.view = 'detail';
			return;
		}

		app.view = 'loading';

		postApi<FullRecipe>('detail', recipe).then((res) => {
			if (res.success) {
				app.fullRecipes.set(recipe.title, res.data);
				app.view = 'detail';
			}
		});
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
  {:else}
    <p>Loading recipe...</p>
  {/if}
{/if}

{#if form?.error}
	<div class="error">
		<h2>Error:</h2>
		<p>{form.error}</p>
	</div>
{/if}