<script lang="ts">
  import type { IconSize } from '$lib/types';
  import IconRoot from './IconRoot.svelte';

  let { size }: { size?: IconSize | number } = $props();
</script>

<IconRoot {size}>
  {#snippet children(iconSize: number | string)}
    <svg
      data-svg-carbon-icon="Checkmark32"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="currentColor"
      width={iconSize}
      height={iconSize}
      preserveAspectRatio="xMidYMid meet"
    >
      <path d="M13 24L4 15 5.414 13.586 13 21.171 26.586 7.586 28 9 13 24z"
      ></path>
    </svg>
  {/snippet}
</IconRoot>
