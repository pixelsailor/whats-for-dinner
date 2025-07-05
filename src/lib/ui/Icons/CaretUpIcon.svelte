<script lang="ts">
	import type { IconSize } from '$lib/types';
	import IconRoot from './IconRoot.svelte';

	let { size }: { size?: IconSize | number } = $props();
</script>

<IconRoot {size}>
	{#snippet children(iconSize: number | string)}
		<svg
			data-svg-carbon-icon="CaretUp32"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 32 32"
			fill="currentColor"
			width={iconSize}
			height={iconSize}
			preserveAspectRatio="xMidYMid meet"
		>
			<path d="M8 20L16 10 24 20z"></path>
		</svg>
	{/snippet}
</IconRoot>
