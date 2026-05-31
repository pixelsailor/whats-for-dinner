<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Dialog, Separator, type WithoutChild } from 'bits-ui';
  import clsx from 'clsx';
  import type { ClassValue } from 'clsx';

  import '../../app.css';

  type Props = Dialog.RootProps & {
    buttonText?: string;
    title: Snippet;
    description: Snippet;
    actions?: Snippet;
    trigger?: Snippet;
    triggerProps?: WithoutChild<Dialog.TriggerProps>;
    contentProps?: WithoutChild<Dialog.ContentProps>;
  };

  let {
    open = $bindable(false),
    children,
    buttonText,
    contentProps,
    title,
    description,
    actions,
    trigger,
    triggerProps = {},
    ...restProps
  }: Props = $props();
</script>

<!--
@component
# Dialog

Reusable ui-bits dialog component.
See [ui-bits Dialog](https://ui-bits.dev/docs/components/dialog/llms.txt) for more information.

## Usage
```html
<Dialog buttonText="Open Dialog" title="Dialog Title" description="Dialog Description">
  <div>Dialog Content</div>
</Dialog>
```
-->

<Dialog.Root bind:open {...restProps}>
  {#if trigger}
    <Dialog.Trigger class={clsx('button', triggerProps?.class)} {...triggerProps}>
      {@render trigger?.()}
    </Dialog.Trigger>
  {/if}
  <Dialog.Portal>
    <Dialog.Overlay
      class={[
        'data-[state=open]:animate-in',
        'data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0',
        'data-[state=open]:fade-in-0',
        'fixed',
        'inset-0',
        'z-50',
        'bg-black/80'
      ]}
    />
    <Dialog.Content
      class={[
        "shadow-popover",
        "data-[state=open]:animate-in",
        "data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0",
        "data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95",
        "data-[state=open]:zoom-in-95",
        "fixed",
        "top-[50%]",
        "left-[50%]",
        "z-50",
        "w-full",
        "max-w-[calc(100%-2rem)]",
        "translate-x-[-50%]",
        "translate-y-[-50%]",
        "rounded",
        "border",
        "bg-gray-50",
        "p-5",
        "outline-hidden",
        "sm:max-w-[490px]",
        "md:w-full",
        "dark:bg-gray-900",
        "grid",
        "grid-cols-1",
        "gap-4",
        ]}
      {...contentProps}
    >
      <Dialog.Title class="title-large text-center">
        {@render title()}
      </Dialog.Title>
      <Separator.Root class="bg-muted -mx-5 block h-px" />
      <Dialog.Description class="body-large ">
        {@render description()}
      </Dialog.Description>

      {@render children?.()}

      {#if actions}
        {@render actions()}
      {:else}
        <Dialog.Close
          class="focus-visible:ring-foreground focus-visible:ring-offset-background focus-visible:outline-hidden absolute right-5 top-5 rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]"
          >Close</Dialog.Close
        >
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style lang="postcss">
  :global(.dialog-description) {

  }
</style>