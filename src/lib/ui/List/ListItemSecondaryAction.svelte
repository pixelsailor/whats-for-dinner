<script lang="ts">
  // This component doesn't do much. It's only purpose is to ensure that secondary action takes the
  // proper amount of space and content within the row is also sized appropriately. Using an
  // `<IconButton>` as the secondary action without nesting it inside the `<ListItemSecondaryAction>`
  // component could result in a larger-than-intended gap between the list item text and the button.

  import { getContext } from 'svelte';

  let size = getContext('pxl-list');

  let { children } = $props();
</script>

<div
  class={[
    'pxl-listitem__secondary-action flex max-w-fit flex-none py-2',
    { 'place-items-center': size === 'two-line' },
    { 'place-items-start': size === 'three-line' }
  ]}
>
  {@render children()}
</div>
