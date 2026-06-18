<script lang="ts">
  import SvelteMarkdown from '@humanspeak/svelte-markdown';
  import { enhance } from '$app/forms';
  // import type { PageProps } from './$types';

  import { deriveAICapability } from '$lib/api/auth/auth.capability';
  import { networkStore } from '$lib/stores/network';

  import Button from '$lib/ui/button.svelte';
  import ChatbotIcon from '$lib/ui/icons/ChatbotIcon.svelte';
  import CloseIcon from '$lib/ui/icons/CloseIcon.svelte';
  import '../../../app.css';

  let { data, open = $bindable() } = $props();

  // let recipeContext = getContext('recipe');

  let textinput = $state('');

  let viewstate = $state<('ask' | 'help')>('ask');

  // let action = $derived(viewstate === 'ask' ? '/recipes?/asksaim' : '?/help');

  let apistate = $state<('idle' | 'loading' | 'success' | 'error')>('idle');

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
        return 'You are offline. Reconnect to ask follow-up questions.';
      case 'disabled':
        return 'AI recipe assistance is unavailable in this build.';
      case 'unauthenticated':
        return 'Log in to ask for recipe adjustments.';
      case 'unauthorized':
        return 'Your account does not include AI recipe assistance.';
      default:
        return '';
    }
  });

  let conversationThread = $state([]);

  let helpContent = $state<string>('');
</script>

<div class="help-drawer__content sticky top-0 bg-background-alt h-dvh flex flex-col">
  <div class="help-drawer-content__header h-16 px-2 flex flex-row justify-end items-center flex-none">
    <Button class="text icon" aria-label="Close" onclick={() => open = false}>
      <CloseIcon size="sm" />
    </Button>
  </div>
  {#if canUseAI}
    <div class="help-drawer-content__body p-2 flex flex-col justify-start grow overflow-y-auto">
      <!-- <SvelteMarkdown source={{}} /> -->
    </div>
    <div class="help-drawer-content__footer p-2 h-16 flex flex-none items-center">
      <form class="w-full" method="POST" action="?/asksaim" use:enhance={(cancel) => {
        console.log('send the saim question');
        
        return async ({ result, update }) => {
          //
        };
      }}>
        <div class="input-group">
          <div class="icon-wrapper ml-2">
            <ChatbotIcon size="sm" />
          </div>
          <label for="textinput" class="sr-only">Ask Saim a question</label>
          <input
            type="text"
            class="textinput"
            name="help_input"
            bind:value={textinput}
            placeholder="Ask Saim a question..."
          />
          <!-- <input type="hidden" name="recipe" value={recipeContext} /> -->
          <Button type="submit" class="text narrow" aria-label="Send">
            <span>Ask</span>
          </Button>
        </div>
      </form>
    </div>
    {:else if aiRestrictionMessage}
      <div class="help-drawer-content__body p-6 flex flex-col justify-center grow">
        <div
          class="mt-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100"
        >
          {aiRestrictionMessage}
        </div>
      </div>
  {/if}
</div>

<style lang="postcss">
  @reference 'tailwindcss';

  /* :global(.help-drawer__content) {
    @apply sticky top-0 bg-background-alt h-dvh;
  }
  :global(.help-drawer-content__header) {
    @apply p-2 flex flex-row justify-end;
  }

  .help-drawer-content__body {
    @apply p-2 flex flex-col justify-start grow overflow-y-auto;
  }

  .help-drawer-content__footer {
    @apply p-2;
  } */
</style>