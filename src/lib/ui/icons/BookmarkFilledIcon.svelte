<script lang="ts">
  import type { IconSize } from '$lib/types';
  import IconRoot from './IconRoot.svelte';

  let { size }: { size?: IconSize | number } = $props();
</script>

<IconRoot {size}>
  {#snippet children(iconSize: number | string)}
    <svg
      data-svg-carbon-icon="BookmarkFilled32"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="currentColor"
      width={iconSize}
      height={iconSize}
      preserveAspectRatio="xMidYMid meet"
    >
      <path d="M24,2H8A2,2,0,0,0,6,4V30l10-5.0538L26,30V4A2,2,0,0,0,24,2Z"></path>
    </svg>
  {/snippet}
</IconRoot>
