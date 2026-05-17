<script lang="ts">
  import { getContext } from 'svelte';

  let { primary, secondary }: { primary: string; secondary?: string } = $props();

  let size = getContext('pxl-list');
</script>

<div class={['pxl-listitem__text flex h-full flex-auto flex-col justify-center truncate py-1 text-left', { 'text-wrap': size === 'three-line' }]}>
  <span class="heading text-nowrap">{primary}</span>
  {#if secondary}
    <span class="">{secondary}</span>
  {/if}
</div>
