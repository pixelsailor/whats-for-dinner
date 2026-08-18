<script lang="ts">
  import Button from '$lib/ui/button.svelte';
  import HelpDrawer from '$lib/ui/help-drawer/help-drawer.svelte';
  import ChatbotIcon from '$lib/ui/icons/ChatbotIcon.svelte';
  // import { createContext, getContext, setContext } from 'svelte';

  let { children, data } = $props();

  let helpDrawerOpen = $state(false);

  let helpContext = $state<string>('');

  function openHelpDrawer() {
    // setContext('')
    helpDrawerOpen = true;
  }
</script>

<div class="flex flex-row w-full">
  <div class="flex flex-col grow relative min-h-dvh">
    {@render children()}
    {#if !helpDrawerOpen}
      <div
        class="drawer-trigger sticky bottom-8 z-10 flex justify-end px-8 pointer-events-none"
      >
        <div class="button-wrapper bg-background rounded-full">
          <Button
            class="primary icon rounded-full! h-11! w-11! shadow-md hover:shadow-md! pointer-events-auto"
            tooltip="Ask Saim"
            aria-label="Ask Saim."
            onclick={() => (helpDrawerOpen = !helpDrawerOpen)}
          >
            <ChatbotIcon size="sm" />
          </Button>
        </div>
      </div>
    {/if}
  </div>
  <div
    class={[
      'help-drawer-container relative transition-all duration-300 ease-in-out will-change-transform',
      helpDrawerOpen ? 'w-md' : 'w-0'
    ]}
  >
    <HelpDrawer bind:open={helpDrawerOpen} {data} />
  </div>
</div>
