<script lang="ts">
	import type { IconSize } from '$lib/types';
	import IconRoot from './IconRoot.svelte';

	let { size }: { size?: IconSize | number } = $props();
</script>

<IconRoot {size}>
	{#snippet children(iconSize: number | string)}
		<svg
			data-svg-carbon-icon="OverflowMenuVertical32"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 32 32"
			fill="currentColor"
			width={iconSize}
			height={iconSize}
			preserveAspectRatio="xMidYMid meet"
		>
			<circle cx="16" cy="8" r="2"></circle><circle cx="16" cy="16" r="2"></circle><circle
				cx="16"
				cy="24"
				r="2"
			></circle>
		</svg>
	{/snippet}
</IconRoot>
