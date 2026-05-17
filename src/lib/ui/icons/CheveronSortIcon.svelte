<script lang="ts">
  import type { IconSize } from '$lib/types';
  import IconRoot from './IconRoot.svelte';

  let { size }: { size?: IconSize | number } = $props();
</script>

<IconRoot {size}>
  {#snippet children(iconSize: number | string)}
    <svg
      data-svg-carbon-icon="ChevronSort32"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="currentColor"
      width={iconSize}
      height={iconSize}
      preserveAspectRatio="xMidYMid meet"
    >
      <path d="M16 28L9 21 10.41 19.59 16 25.17 21.59 19.59 23 21 16 28zM16 4L23 11 21.59 12.41 16 6.83 10.41 12.41 9 11 16 4z"></path>
    </svg>
  {/snippet}
</IconRoot>
