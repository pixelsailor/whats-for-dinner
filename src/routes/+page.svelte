<script lang="ts">
	import { enhance } from "$app/forms";
	import type { FullRecipe, RecipeSummary } from "$lib/types";

  let { data, form } = $props();

  let app = $state({
    input: '',
    view: 'idle',
    suggestions: [] as RecipeSummary[],
    selected: null as RecipeSummary | null,
    fullRecipes: new Map<string, FullRecipe>()
  });

  let request = $state('');
  let loading = $state(false);

  let selectedRecipe = $state<RecipeSummary>();

  let apiResponse: any = $state();
  let apiError = $state();

  let isIdle = $derived(!form);

  async function postApi<T = string>(action: string, data: T) {
    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, ...data })
      });

      const result = await response.json();
      
      if (result.success) {
        apiResponse = result.response;
      } else {
        apiError = result.error || 'Unknown error occurred';
      }
    } catch (error) {
      apiError = 'Failed to make request';
      console.error('API request error:', error);
    } finally {
      console.log("we're done");
    }
  }

  function selectRecipe(recipe: RecipeSummary) {
    selectedRecipe = recipe;
    postApi<RecipeSummary>('detail', recipe);
  }

  $inspect('data', data);
  $inspect('response', apiResponse);
</script>

{#if isIdle}
  <h1 class="text-2xl font-bold my-4">What are you hungry for?</h1>

  <form
    method="POST"
    use:enhance={({ formElement, formData, action, cancel, submitter }) => {
      loading = true;
      return async ({ result, update }) => {
        loading = false;
        await update();
      }
    }}
  >
    <input type="text" name="request" bind:value={request} class="w-full p-2 border rounded" />
    <button class="bg-green-600 text-white px-4 py-2 rounded" type="submit" disabled={loading || !request.trim()}>
      {loading ? 'Thinking...' : 'Get ideas'}
    </button>
  </form>
{/if}

{#if form?.success && form?.response}
  <div class="response">
    <h2 class="my-4">Here are some ideas:</h2>
    <ul class="my-4">
      {#each form.response as suggestion}
        <li class="h-18">
          <button class="h-full w-full py-2 overflow-hidden text-left" onclick={() => selectRecipe(suggestion)}>
            <p class="font-bold">{suggestion.title}</p>
            <p class="text-sm">{suggestion.short_description}</p>
          </button>
        </li>
      {/each}
    </ul>
  </div>
{/if}

{#if form?.error}
  <div class="error">
    <h2>Error:</h2>
    <p>{form.error}</p>
  </div>
{/if}

{#if selectedRecipe}
  <div>
    <button onclick={() => apiResponse = undefined}>
      Back to suggestions
    </button>
  </div>

  <h2 class="text-lg font-bold my-2">{selectedRecipe.title}</h2>

  {#if apiResponse}
    <p class="my-2">{@html apiResponse}</p>
  {:else}
    <p>Loading recipe...</p>
  {/if}
{/if}