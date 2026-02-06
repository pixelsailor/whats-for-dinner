<script lang="ts">
	import type { IconSize } from '$lib/types';
	import IconRoot from './IconRoot.svelte';

	let { size }: { size?: IconSize | number } = $props();
</script>

<IconRoot {size}>
	{#snippet children(iconSize: number | string)}
		<svg
			data-svg-carbon-icon="ChevronLeft32"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 32 32"
			fill="currentColor"
			width={iconSize}
			height={iconSize}
			preserveAspectRatio="xMidYMid meet"
		>
			<path d="M10 16L20 6 21.4 7.4 12.8 16 21.4 24.6 20 26z"></path>
		</svg>
	{/snippet}
</IconRoot>
