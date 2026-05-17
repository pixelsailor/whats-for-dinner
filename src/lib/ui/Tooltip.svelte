<script lang="ts">
  import { Tooltip } from 'bits-ui';
  import type { Snippet } from 'svelte';

  type Props = Tooltip.RootProps & {
    trigger: Snippet;
    triggerProps?: Tooltip.TriggerProps;
  };

  let { open = $bindable(false), children, trigger, triggerProps = {}, ...restProps }: Props = $props();
</script>

<!--
@component
# Tooltip

Reusable ui-bits tooltip component.

- Usage
```html
<Tooltip triggerProps={{ onclick: () => alert("Hello, world!") }}>
  {#snippet trigger()}
    <SettingsIcon size="xs" />
  {/snippet}
  <span>Tooltip content</span>
</Tooltip>
```
-->
<Tooltip.Provider delayDuration={300} ignoreNonKeyboardFocus={true}>
  <Tooltip.Root bind:open {...restProps}>
    <Tooltip.Trigger {...triggerProps}>
      {@render trigger()}
    </Tooltip.Trigger>
    <Tooltip.Portal>
      <Tooltip.Content
        class="helper-text rounded-sm border border-gray-600 bg-gray-600/80 px-2 py-1 text-gray-50 shadow-sm dark:border-gray-300 dark:bg-gray-300/80 dark:text-gray-900"
      >
        <Tooltip.Arrow class="text-gray-600 dark:text-gray-300" />
        {@render children?.()}
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
</Tooltip.Provider>
