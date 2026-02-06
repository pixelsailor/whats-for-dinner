<script lang="ts">
	import type { IconSize } from '$lib/types';
	import IconRoot from './IconRoot.svelte';

	let { size }: { size?: IconSize | number } = $props();
</script>

<IconRoot {size}>
	{#snippet children(iconSize: number | string)}
		<svg
			data-svg-carbon-icon="ChevronRight32"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 32 32"
			fill="currentColor"
			width={iconSize}
			height={iconSize}
			preserveAspectRatio="xMidYMid meet"
		>
			<path d="M22 16L12 26 10.6 24.6 19.2 16 10.6 7.4 12 6z"></path>
		</svg>
	{/snippet}
</IconRoot>
