<script lang="ts">
  import type { IconSize } from '$lib/types';
  import IconRoot from './IconRoot.svelte';

  let { size }: { size?: IconSize | number } = $props();
</script>

<IconRoot {size}>
  {#snippet children(iconSize: number | string)}
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 16 16"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      xml:space="preserve"
      style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"
      fill="currentColor"
    >
      <path
        d="M3.309,1L8.5,1L12.691,1C13.07,1 13.416,1.214 13.585,1.553L14.947,5.276C14.982,5.346 15,5.422 15,5.5L15,14C15,14.552 14.552,15 14,15L2,15C1.448,15 1,14.552 1,14L1,5.5C1,5.422 1.018,5.346 1.053,5.276L2.415,1.553C2.584,1.214 2.93,1 3.309,1ZM13.024,3L12.691,2L3.309,2L2.976,3L13.024,3ZM14,6L2,6L2,14L14,14L14,6ZM5.5,8L10.5,8C10.776,8 11,8.224 11,8.5C11,8.776 10.776,9 10.5,9L5.5,9C5.224,9 5,8.776 5,8.5C5,8.224 5.224,8 5.5,8ZM2.642,4L2.309,5L13.691,5L13.358,4L2.642,4Z"
      />
    </svg>
  {/snippet}
</IconRoot>
