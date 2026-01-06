<script lang="ts">
	let { primary, secondary }: { primary: string; secondary?: string } = $props();
</script>

<div class="pxl-app-bar__text grow">
  <h1 class="pxl-app-bar__text text-start font-bold text-md">{primary}</h1>
  {#if secondary}
		<p class="text-sm text-start">{secondary}</p>
	{/if}
</div>
