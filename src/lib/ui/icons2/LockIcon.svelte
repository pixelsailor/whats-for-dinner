<script lang="ts">
	import type { IconSize } from '$lib/types';
	import IconRoot from './IconRoot.svelte';

	let { size }: { size?: IconSize | number } = $props();
</script>

<IconRoot {size}>
	{#snippet children(iconSize: number | string)}
	<svg data-svg-carbon-icon="Locked32" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="currentColor" width={iconSize} height={iconSize} preserveAspectRatio="xMidYMid meet">
		<path d="M24,14H22V8A6,6,0,0,0,10,8v6H8a2,2,0,0,0-2,2V28a2,2,0,0,0,2,2H24a2,2,0,0,0,2-2V16A2,2,0,0,0,24,14ZM12,8a4,4,0,0,1,8,0v6H12ZM24,28H8V16H24Z"></path>
	</svg>
	{/snippet}
</IconRoot>
