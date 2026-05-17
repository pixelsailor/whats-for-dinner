<script lang="ts">
  let { children } = $props();
</script>

<div class="w-content -mr-3 ml-auto flex flex-none flex-row items-center gap-1">
  {@render children()}
</div>
