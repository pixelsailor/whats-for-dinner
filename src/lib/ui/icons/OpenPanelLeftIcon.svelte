<script lang="ts">
  import type { IconSize } from '$lib/types';
  import IconRoot from './IconRoot.svelte';

  let { size }: { size?: IconSize | number } = $props();
</script>

<IconRoot {size}>
  {#snippet children(iconSize: number | string)}
    <svg
      data-svg-carbon-icon="OpenPanelLeft32"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="currentColor"
      width={iconSize}
      height={iconSize}
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d="M28,4H4A2,2,0,0,0,2,6V26a2,2,0,0,0,2,2H28a2,2,0,0,0,2-2V6A2,2,0,0,0,28,4ZM4,6h6V26H4ZM28,26H12V6H28Z"
      ></path>
    </svg>
  {/snippet}
</IconRoot>
