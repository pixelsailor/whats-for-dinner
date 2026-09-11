<script lang="ts">
  import { Button, Tooltip } from 'bits-ui';
  import type { Snippet } from 'svelte';
  import clsx, { type ClassValue } from 'clsx';

  type Props = Button.RootProps & {
    class?: ClassValue;
    tooltip?: string;
    open?: boolean;
    triggerProps?: Tooltip.TriggerProps;
    children?: Snippet;
  };

  let {
    class: klassProp,
    open = $bindable(false),
    children,
    tooltip,
    triggerProps = {},
    ...buttonProps
  }: Props = $props();

  let klass = $derived(clsx('button', klassProp));
</script>

<!--
@component
# Button

A custom button component that provides a consistent styling and behavior for buttons.
Includes built-in tooltip support. A `Tooltip.Provider` is required in the parent or root component.

@example
```html
<Button class="text icon" tooltip="Refresh" onclick={refreshRecommendations} disabled={loading}>
  <ArrowsClockwiseIcon size="xs" />
</Button>
```
-->

{#snippet button()}
  <Button.Root {...buttonProps} class={klass}>
    {@render children?.()}
  </Button.Root>
{/snippet}

{#if tooltip}
  <Tooltip.Root bind:open>
    <Tooltip.Trigger {...triggerProps}>
      {#snippet child({ props })}
        <Button.Root
          {...props}
          aria-label={tooltip}
          {...buttonProps}
          class={klass}
        >
          {@render children?.()}
        </Button.Root>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content
        class="helper-text z-100 rounded-sm border border-gray-600 bg-gray-600/80 px-2 py-1 text-gray-50 shadow-sm dark:border-gray-300 dark:bg-gray-300/80 dark:text-gray-900"
      >
        <Tooltip.Arrow class="text-gray-600 dark:text-gray-300" />
        {tooltip}
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
{:else}
  {@render button()}
{/if}
