<script lang="ts">
	import { enhance } from "$app/forms";

  let { data, form } = $props();

  let request = $state('');
  let loading = $state(false);

</script>

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

  {#if form?.success && form?.response}
    <div class="response">
      <h2>Response:</h2>
      <p>{form.response}</p>
    </div>
  {/if}

  {#if form?.error}
    <div class="error">
      <h2>Error:</h2>
      <p>{form.error}</p>
    </div>
  {/if}
</form>