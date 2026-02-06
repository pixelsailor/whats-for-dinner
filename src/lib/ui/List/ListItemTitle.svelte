<script lang="ts">
	let { children } = $props();
</script>

<svelte:element this={'p'} class="title-large">
	{@render children()}
</svelte:element>