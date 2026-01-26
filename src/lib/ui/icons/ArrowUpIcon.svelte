<script lang="ts">
	import type { IconSize } from '$lib/types';
	import IconRoot from './IconRoot.svelte';

	let { size }: { size?: IconSize | number } = $props();
</script>

<IconRoot {size}>
	{#snippet children(iconSize: number | string)}
		<svg
			data-svg-carbon-icon="ArrowUp32"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 32 32"
			fill="currentColor"
			width={iconSize}
			height={iconSize}
			preserveAspectRatio="xMidYMid meet"
		>
			<path d="M16 4L6 14 7.41 15.41 15 7.83 15 28 17 28 17 7.83 24.59 15.41 26 14 16 4z"></path>
		</svg>
	{/snippet}
</IconRoot>
