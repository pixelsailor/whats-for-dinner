<script lang="ts">
  import SvelteMarkdown from '@humanspeak/svelte-markdown';
  import { tick } from 'svelte';
  import { enhance } from '$app/forms';
  import { page } from '$app/state';

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

  /** Page-local state for one recipe-scoped Saim conversation. */
  type ConversationSession = {
    context: string;
    id: string;
    acceptedRecipeJson: string;
    thread: ChatMessage[];
    error: string;
    apiState: 'idle' | 'loading' | 'error';
  };

  let { data, open = $bindable() } = $props();

  let textinput = $state('');
  let textinputRef = $state<HTMLInputElement | null>(null);
  let viewstate = $state<'ask' | 'help'>('ask');

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

  let conversationSession = $state<ConversationSession>({
    context: '',
    id: '',
    acceptedRecipeJson: '',
    thread: [],
    error: '',
    apiState: 'idle'
  });
  let threadBody = $state<HTMLDivElement | null>(null);

  let recipeJson = $derived(data.recipe ? JSON.stringify(data.recipe) : '');
  let pageContext = $derived(
    data.recipe?.id ? `${page.url.pathname}:${data.recipe.id}` : ''
  );
  let activeConversationSession = $derived(
    conversationSession.context === pageContext
      ? conversationSession
      : undefined
  );
  let conversationThread = $derived(activeConversationSession?.thread ?? []);
  let conversationId = $derived(activeConversationSession?.id ?? '');
  let acceptedRecipeJson = $derived(
    activeConversationSession?.acceptedRecipeJson ?? ''
  );
  let submitError = $derived(activeConversationSession?.error ?? '');
  let apistate = $derived(activeConversationSession?.apiState ?? 'idle');
  let recipeContextChanged = $derived(
    Boolean(
      conversationId && acceptedRecipeJson && recipeJson !== acceptedRecipeJson
    )
  );

  $effect(() => {
    if (textinputRef && open) {
      textinputRef.focus();
    }
  });

  /**
   * Creates a stable id for a chat message row.
   * @returns Random UUID string
   */
  function createMessageId(): string {
    return crypto.randomUUID();
  }

  /**
   * Starts empty client state when the active recipe or page changes.
   */
  function ensureActiveConversationSession(): void {
    if (conversationSession.context !== pageContext) {
      conversationSession = {
        context: pageContext,
        id: '',
        acceptedRecipeJson: '',
        thread: [],
        error: '',
        apiState: 'idle'
      };
    }
  }

  /**
   * Keeps a reference to the scrollable thread without `bind:this`.
   * @param node - Conversation thread container
   * @returns Cleanup callback for the attachment
   */
  function attachThreadBody(node: HTMLDivElement): () => void {
    threadBody = node;
    return () => {
      if (threadBody === node) {
        threadBody = null;
      }
    };
  }

  /**
   * Scrolls the conversation after Svelte renders the latest turn.
   */
  async function scrollThreadToEnd(): Promise<void> {
    await tick();
    if (threadBody) {
      threadBody.scrollTop = threadBody.scrollHeight;
    }
  }
</script>

<!--
@component
Side drawer for asking Saim cooking questions about the current recipe.

- Renders a scrollable conversation when `viewstate` is `ask` and AI is available.
- Assistant replies are rendered as markdown via `SvelteMarkdown`.
- Keeps the OpenAI Conversation id in page memory and resets it on recipe/page navigation.
- Posts changed recipe snapshots with the next question so follow-ups use current context.
-->

<div
  class="help-drawer__content sticky top-0 bg-background-alt h-dvh flex flex-col"
>
  <div
    class="help-drawer-content__header h-16 px-2 flex flex-row justify-end items-center flex-none"
  >
    <Button class="text icon" aria-label="Close" onclick={() => (open = !open)}>
      <CloseIcon size="sm" />
    </Button>
  </div>
  {#if canUseAI && viewstate === 'ask'}
    <div
      {@attach attachThreadBody}
      class="help-drawer-content__body p-2 flex flex-col justify-start grow overflow-y-auto"
    >
      {#if conversationThread.length === 0 && apistate !== 'loading'}
        <p class="text-sm text-muted-foreground">
          Ask a question about this recipe.
        </p>
      {/if}
      {#each conversationThread as message (message.id)}
        {#if message.role === 'user'}
          <p class="text-sm my-2 bg-blue-500 text-white p-2 rounded-md">
            {message.content}
          </p>
        {:else}
          <div
            class="markdown text-sm my-2 bg-gray-100 text-gray-900 dark:bg-gray-900 dark:text-gray-100 p-2 rounded-md"
          >
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
          const submittedRecipeJson = recipeJson;
          const submittedPageContext = pageContext;

          if (!question || !submittedRecipeJson || apistate === 'loading') {
            cancel();
            return;
          }

          ensureActiveConversationSession();
          conversationSession.thread = [
            ...conversationSession.thread,
            {
              id: createMessageId(),
              role: 'user',
              content: question
            }
          ];
          textinput = '';
          conversationSession.apiState = 'loading';
          conversationSession.error = '';
          void scrollThreadToEnd();

          return async ({ result }) => {
            if (conversationSession.context !== submittedPageContext) {
              return;
            }

            if (result.type === 'success') {
              const answer = result.data?.answer;
              const returnedConversationId = result.data?.conversationId;

              if (
                typeof answer === 'string' &&
                answer.length > 0 &&
                typeof returnedConversationId === 'string' &&
                returnedConversationId.length > 0
              ) {
                conversationSession.thread = [
                  ...conversationSession.thread,
                  {
                    id: createMessageId(),
                    role: 'assistant',
                    content: answer
                  }
                ];
                conversationSession.id = returnedConversationId;
                conversationSession.acceptedRecipeJson = submittedRecipeJson;
                conversationSession.apiState = 'idle';
                void scrollThreadToEnd();
              } else {
                conversationSession.error = 'Saim returned an empty response.';
                conversationSession.apiState = 'error';
              }
            } else if (result.type === 'failure') {
              const failureData = result.data as { error?: string } | undefined;
              conversationSession.error =
                failureData?.error ??
                'Unable to get a response. Please try again.';
              if (result.status === 409) {
                conversationSession.id = '';
                conversationSession.acceptedRecipeJson = '';
              }
              conversationSession.apiState = 'error';
            } else {
              conversationSession.error =
                'Unable to get a response. Please try again.';
              conversationSession.apiState = 'error';
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
            bind:this={textinputRef}
            id="textinput"
            type="text"
            class="textinput"
            name="help_input"
            bind:value={textinput}
            placeholder="Ask Saim a question..."
            disabled={apistate === 'loading'}
            autocomplete="off"
          />
          <input type="hidden" name="recipe" value={recipeJson} />
          <input type="hidden" name="conversation_id" value={conversationId} />
          <input
            type="hidden"
            name="recipe_context_changed"
            value={recipeContextChanged ? 'true' : 'false'}
          />
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
