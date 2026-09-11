<script lang="ts">
  import { Button } from 'bits-ui';

  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';

  import { getGreeting } from '$lib/greetings';
  import Prompt from '$lib/ui/Prompt.svelte';
  import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
  import { networkStore } from '$lib/stores/network';
  import { deriveAICapability } from '$lib/api/auth/auth.capability';
  import ChatbotIcon from '$lib/ui/icons/ChatbotIcon.svelte';

  let { data } = $props();
  let network = $derived($networkStore);
  let aiCapability = $derived(
    deriveAICapability({
      session: data.session,
      permissions: data.permissions,
      featureFlags: data.featureFlags,
      online: network.online
    })
  );
  let canUseAI = $derived(aiCapability.canUseAI);
  let aiRestrictionMessage = $derived.by(() => {
    switch (aiCapability.reason) {
      case 'offline':
        return 'You are offline. Reconnect to request fresh suggestions.';
      case 'disabled':
        return 'AI suggestions are unavailable in this build.';
      case 'unauthenticated':
        return 'Log in to request AI-powered recipe suggestions.';
      case 'unauthorized':
        return 'Your account does not include AI suggestions.';
      default:
        return '';
    }
  });

  let app = $state({
    input: '',
    view: 'idle' as 'idle' | 'detail' | 'suggestions' | 'loading' | 'error',
    error: ''
  });

  // Show request status without changing app.view
  let working = $state(false);

  let promptInputRef = $state<HTMLInputElement>();

  /** Handles prompt form, sending input value as URL params */
  function getSuggestions(e: Event) {
    e.preventDefault();
    if (!app.input.trim()) return;

    working = true;
    const prompt = encodeURIComponent(app.input);
    goto(resolve(`/suggestions?prompt=${prompt}`));
  }
</script>

<svelte:head>
  <title>What's for dinner?</title>
</svelte:head>

<div
  class="mx-auto flex h-screen max-w-5xl items-center px-4 lg:px-8"
  style:height={app.view === 'suggestions' ? 'auto' : ''}
>
  {#if app.view === 'loading'}
    <div class="absolute inset-0 grid place-content-center">
      <ProgressSpinner size="lg" />
    </div>
  {:else if app.view === 'idle'}
    <div class="mx-auto w-full max-w-3xl">
      <h1 class="display-small mb-6 text-center">{getGreeting()}</h1>
      {#if canUseAI}
        <Prompt
          style="margin-bottom: 0"
          tabindex="0"
          onclick={() => {
            promptInputRef?.focus();
          }}
          onfocus={() => {
            promptInputRef?.focus();
          }}
        >
          <form class="flex w-full flex-row gap-2" onsubmit={getSuggestions}>
            <div class="flex flex-row items-center gap-2">
              <ChatbotIcon size="md" />
            </div>
            <input
              class="grow bg-transparent! focus-visible:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
              type="text"
              name="input"
              bind:this={promptInputRef}
              bind:value={app.input}
              placeholder="Ask for event ideas, regional recipes, or just list ingredients"
              disabled={working}
            />
            <Button.Root
              type="submit"
              class="button text narrow"
              disabled={working || !app.input.trim()}
            >
              {working ? 'Thinking...' : 'Get ideas'}
            </Button.Root>
          </form>
        </Prompt>
      {:else if aiRestrictionMessage}
        <p class="text-center text-gray-500">{aiRestrictionMessage}</p>
      {/if}
      <div class="mt-2 flex flex-row justify-center gap-4">
        <Button.Root href="/suggestions" class="button text"
          >Recent Suggestions</Button.Root
        >
        <Button.Root href="/recommendations" class="button text"
          >Recommended</Button.Root
        >
        <Button.Root href="/recipes" class="button text"
          >Surprise Me!</Button.Root
        >
      </div>
    </div>
  {:else if app.view === 'error'}
    <div class="error">
      <h1 class="headline-medium my-4">
        Ah donkeyspittle! There was a problem.
      </h1>
      <p class="my-4">Refresh the browser and try again.</p>
      <p>{app.error}</p>
    </div>
  {/if}
</div>
