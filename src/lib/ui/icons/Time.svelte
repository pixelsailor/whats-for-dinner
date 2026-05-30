<script lang="ts">
  import type { IconSize } from '$lib/types';
  import IconRoot from './IconRoot.svelte';

  let { size, ariaLabel }: { size?: IconSize | number; ariaLabel?: string } = $props();
</script>

<IconRoot {size}>
  {#snippet children(iconSize: number | string)}
    <svg
      data-svg-carbon-icon="Time32"
      xmlns="http://www.w3.org/2000/svg"
      width={iconSize}
      height={iconSize}
      fill="currentColor"
      viewBox="0 0 32 32"
      aria-label={ariaLabel || 'Time'}
      preserveAspectRatio="xMidYMid meet"
    >
      <path d="M16,30A14,14,0,1,1,30,16,14,14,0,0,1,16,30ZM16,4A12,12,0,1,0,28,16,12,12,0,0,0,16,4Z"></path>
      <path d="M20.59 22 15 16.41 15 7 17 7 17 15.58 22 20.59 20.59 22z"></path>
    </svg>
  {/snippet}
</IconRoot>
