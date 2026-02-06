<script lang="ts">
	// import { getContext } from "svelte";

	let { children } = $props();

  // let size = getContext('pxl-list');
</script>

<svelte:element this={'p'} class="pxl-listitem__text body-medium text-foreground-alt dark:text-foreground-alt">
  {@render children()}
</svelte:element>
