<script lang="ts">
	let { viewed }: { viewed: boolean } = $props();
</script>

{#if viewed}
	<span class="tag label-small uppercase">
		Viewed
	</span>
{/if}
