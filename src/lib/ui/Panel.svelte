<script lang="ts">
  import type { ClassValue } from 'svelte/elements';

  type PanelProps = {
    bordered?: boolean;
    children: any;
    class?: ClassValue;
    shadow?: boolean;
  };
  let { bordered, children, shadow, ...props }: PanelProps = $props();
</script>

<div class={['rounded-lg border border-gray-200 bg-gray-100 p-3 shadow-xs dark:border-gray-700 dark:bg-gray-900', props.class]}>
  {@render children()}
</div>
