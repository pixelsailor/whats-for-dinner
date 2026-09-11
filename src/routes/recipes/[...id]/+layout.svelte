<script lang="ts">
  import Button from '$lib/ui/button.svelte';
  import HelpDrawer from '$lib/ui/help-drawer/help-drawer.svelte';
  import ChatbotIcon from '$lib/ui/icons/ChatbotIcon.svelte';

  let { children, data } = $props();

  let helpDrawerOpen = $state(false);
</script>

<div class="flex w-full flex-row">
  <div class="relative flex min-h-dvh grow flex-col">
    {@render children()}
    {#if !helpDrawerOpen}
      <div
        class="drawer-trigger pointer-events-none sticky bottom-8 z-10 flex justify-end px-8"
      >
        <div class="button-wrapper bg-background rounded-full">
          <Button
            class="primary icon pointer-events-auto h-11! w-11! rounded-full! shadow-md hover:shadow-md!"
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
