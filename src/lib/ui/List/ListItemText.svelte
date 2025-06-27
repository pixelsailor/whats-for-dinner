<script lang="ts">
	import { getContext } from "svelte";

	let { primary, secondary }: { primary: string; secondary?: string } = $props();

  let size = getContext('pxl-list');
</script>

<div class={['pxl-listitem__text flex flex-col h-full flex-auto py-2 text-left truncate', {'text-wrap': size === 'three-line'}]}>
  <span class="font-bold text-md text-nowrap">{primary}</span>
  {#if secondary}
    <span class="text-sm">{secondary}</span>
  {/if}
</div>
