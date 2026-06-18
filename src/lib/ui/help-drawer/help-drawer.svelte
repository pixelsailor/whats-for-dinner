<script lang="ts">
  import SvelteMarkdown from '@humanspeak/svelte-markdown';
  import { enhance } from '$app/forms';

  import { deriveAICapability } from '$lib/api/auth/auth.capability';
  import { networkStore } from '$lib/stores/network';

  import Button from '$lib/ui/button.svelte';
  import ChatbotIcon from '$lib/ui/icons/ChatbotIcon.svelte';
  import CloseIcon from '$lib/ui/icons/CloseIcon.svelte';
  import ProgressSpinner from '$lib/ui/ProgressSpinner.svelte';
  import '../../../app.css';

  /** Single turn in the ask-Saim conversation thread. */
  type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
  };

  let { data, open = $bindable() } = $props();

  let textinput = $state('');

  let viewstate = $state<'ask' | 'help'>('ask');

  let apistate = $state<'idle' | 'loading' | 'success' | 'error'>('idle');

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

  let conversationThread = $state<ChatMessage[]>([]);
  let submitError = $state('');
  let threadBody = $state<HTMLDivElement | null>(null);
  let lastRecipeId = $state<string | undefined>(undefined);

  let recipeJson = $derived(
    data.recipe ? JSON.stringify(data.recipe) : ''
  );

  /**
   * Creates a stable id for a chat message row.
   * @returns Random UUID string
   */
  function createMessageId(): string {
    return crypto.randomUUID();
  }

  $effect(() => {
    const recipeId = data.recipe?.id;
    if (recipeId === undefined || recipeId === lastRecipeId) {
      return;
    }
    lastRecipeId = recipeId;
    conversationThread = [];
    submitError = '';
    apistate = 'idle';
  });

  $effect(() => {
    const messageCount = conversationThread.length;
    const loading = apistate === 'loading';

    if (threadBody && (messageCount > 0 || loading)) {
      threadBody.scrollTop = threadBody.scrollHeight;
    }
  });
</script>

<!--
@component
Side drawer for asking Saim cooking questions about the current recipe.

- Renders a scrollable conversation when `viewstate` is `ask` and AI is available.
- Assistant replies are rendered as markdown via `SvelteMarkdown`.
- Posts to the current page `asksaim` form action with recipe JSON context.
-->

<div
  class="help-drawer__content sticky top-0 bg-background-alt h-dvh flex flex-col"
>
  <div
    class="help-drawer-content__header h-16 px-2 flex flex-row justify-end items-center flex-none"
  >
    <Button class="text icon" aria-label="Close" onclick={() => (open = false)}>
      <CloseIcon size="sm" />
    </Button>
  </div>
  {#if canUseAI && viewstate === 'ask'}
    <div
      bind:this={threadBody}
      class="help-drawer-content__body p-2 flex flex-col justify-start grow overflow-y-auto"
    >
      {#if conversationThread.length === 0 && apistate !== 'loading'}
        <p class="text-sm text-muted-foreground">
          Ask a question about this recipe.
        </p>
      {/if}
      {#each conversationThread as message (message.id)}
        {#if message.role === 'user'}
          <p class="text-sm my-2">{message.content}</p>
        {:else}
          <div class="markdown text-sm my-2">
            <SvelteMarkdown source={message.content} />
          </div>
        {/if}
      {/each}
      {#if apistate === 'loading'}
        <div class="my-2 flex items-center gap-2">
          <ProgressSpinner size="xs" />
          <span class="text-sm">Saim is thinking…</span>
        </div>
      {/if}
      {#if submitError}
        <div
          class="mt-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100"
        >
          {submitError}
        </div>
      {/if}
    </div>
    <div
      class="help-drawer-content__footer p-2 h-16 flex flex-none items-center"
    >
      <form
        class="w-full"
        method="POST"
        action="?/asksaim"
        use:enhance={({ cancel }) => {
          const question = textinput.trim();

          if (!question || !recipeJson || apistate === 'loading') {
            cancel();
            return;
          }

          conversationThread = [
            ...conversationThread,
            {
              id: createMessageId(),
              role: 'user',
              content: question
            }
          ];
          textinput = '';
          apistate = 'loading';
          submitError = '';

          return async ({ result }) => {
            if (result.type === 'success') {
              const answer = result.data?.answer;

              if (typeof answer === 'string' && answer.length > 0) {
                conversationThread = [
                  ...conversationThread,
                  {
                    id: createMessageId(),
                    role: 'assistant',
                    content: answer
                  }
                ];
                apistate = 'idle';
              } else {
                submitError = 'Saim returned an empty response.';
                apistate = 'error';
              }
            } else if (result.type === 'failure') {
              const failureData = result.data as { error?: string } | undefined;
              submitError =
                failureData?.error ??
                'Unable to get a response. Please try again.';
              apistate = 'error';
            } else {
              submitError = 'Unable to get a response. Please try again.';
              apistate = 'error';
            }
          };
        }}
      >
        <div class="input-group">
          <div class="icon-wrapper ml-2">
            <ChatbotIcon size="sm" />
          </div>
          <label for="textinput" class="sr-only">Ask Saim a question</label>
          <input
            id="textinput"
            type="text"
            class="textinput"
            name="help_input"
            bind:value={textinput}
            placeholder="Ask Saim a question..."
            disabled={apistate === 'loading'}
          />
          <input type="hidden" name="recipe" value={recipeJson} />
          <Button
            type="submit"
            class="text narrow"
            aria-label="Send"
            disabled={apistate === 'loading' || !textinput.trim()}
          >
            <span>Ask</span>
          </Button>
        </div>
      </form>
    </div>
  {:else if aiRestrictionMessage}
    <div
      class="help-drawer-content__body p-6 flex flex-col justify-center grow"
    >
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
