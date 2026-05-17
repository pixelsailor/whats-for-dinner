<script lang="ts">
  let { primary, secondary }: { primary: string; secondary?: string } = $props();
</script>

<div class="pxl-app-bar__text grow">
  <h1 class="pxl-app-bar__text text-md text-start font-bold">{primary}</h1>
  {#if secondary}
    <p class="text-start text-sm">{secondary}</p>
  {/if}
</div>
