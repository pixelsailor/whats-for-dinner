<script lang="ts">
  // import { clsx } from 'clsx';
  import type { IconSize } from '$lib/types';
  import IconRoot from './IconRoot.svelte';

  let { size, ...restProps }: { size?: IconSize | number; [x: string]: any } = $props();
</script>

<IconRoot {size}>
  {#snippet children(iconSize: number | string)}
    <svg
      data-svg-carbon-icon="CalendarHeatMap32"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="currentColor"
      width={iconSize}
      height={iconSize}
      preserveAspectRatio="xMidYMid meet"
      {...restProps}
    >
      <path
        d="M26,4H22V2H20V4H12V2H10V4H6A2.0025,2.0025,0,0,0,4,6V26a2.0025,2.0025,0,0,0,2,2H26a2.0025,2.0025,0,0,0,2-2V6A2.0025,2.0025,0,0,0,26,4ZM6,6h4V8h2V6h8V8h2V6h4l0,4H6Zm0,6h5v6H6ZM19,26H13V20h6Zm0-8H13V12h6Zm2,8V20h5l.0012,6Z"
      ></path>
    </svg>
  {/snippet}
</IconRoot>
