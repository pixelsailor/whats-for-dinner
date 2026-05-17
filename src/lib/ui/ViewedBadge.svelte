<script lang="ts">
  let { viewed }: { viewed: boolean } = $props();
</script>

{#if viewed}
  <span class="tag subtle label-small uppercase"> Viewed </span>
{/if}
