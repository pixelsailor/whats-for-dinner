<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Dialog, Separator, type WithoutChild } from 'bits-ui';

  type Props = Dialog.RootProps & {
    buttonText?: string;
    title: Snippet;
    description: Snippet;
    actions?: Snippet;
    contentProps?: WithoutChild<Dialog.ContentProps>;
  };

  let { open = $bindable(false), children, buttonText, contentProps, title, description, actions, ...restProps }: Props = $props();
</script>

<!--

@component
# Dialog

Reusable ui-bits dialog component.
See [ui-bits Dialog](https://ui-bits.dev/docs/components/dialog/llms.txt) for more information.

- Usage
```html
<Dialog buttonText="Open Dialog" title="Dialog Title" description="Dialog Description">
  <div>Dialog Content</div>
</Dialog>
```
-->

<Dialog.Root bind:open {...restProps}>
  <!-- <Dialog.Trigger
    class="rounded-input bg-dark text-background shadow-mini hover:bg-dark/95 focus-visible:ring-foreground focus-visible:ring-offset-background focus-visible:outline-hidden inline-flex h-12 items-center justify-center whitespace-nowrap px-[21px] text-[15px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]"
  >
    {buttonText}
  </Dialog.Trigger> -->
  <Dialog.Portal>
    <Dialog.Overlay
      class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/80"
    />
    <Dialog.Content
      class="shadow-popover data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] rounded border bg-gray-50 p-5 outline-hidden sm:max-w-[490px] md:w-full dark:bg-gray-900"
      {...contentProps}
    >
      <Dialog.Title class="flex w-full items-center justify-center text-lg font-semibold tracking-tight">
        {@render title()}
      </Dialog.Title>
      <Separator.Root class="bg-muted -mx-5 mt-5 mb-6 block h-px" />
      <Dialog.Description class="text-foreground-alt text-sm">
        {@render description()}
      </Dialog.Description>

      {@render children?.()}

      {#if actions}
        {@render actions()}
      {:else}
        <Dialog.Close
          class="h-input rounded-input bg-dark text-background shadow-mini hover:bg-dark/95 focus-visible:ring-dark focus-visible:ring-offset-background inline-flex items-center justify-center px-[50px] text-[15px] font-semibold focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden active:scale-[0.98]"
          >Close</Dialog.Close
        >
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
