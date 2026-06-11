<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';

  type CardProps = {
    children: Snippet;
    class?: ClassValue;
  };
  let { children, class: className, ...props }: CardProps = $props();
</script>

<div
  class={[
    'card',
    'rounded-card',
    'bg-background-alt',
    'shadow-card',
    'p-card',
    'border',
    'border-border-card',
    className
  ]}
  {...props}
>
  {@render children()}
</div>
