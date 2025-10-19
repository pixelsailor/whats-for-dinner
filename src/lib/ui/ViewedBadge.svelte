<script lang="ts">
	let { viewed }: { viewed: boolean } = $props();
</script>

{#if viewed}
	<span class="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded-full dark:bg-gray-800 dark:text-gray-400">
		Viewed
	</span>
{/if}
