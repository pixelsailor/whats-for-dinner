<script lang="ts">
	import type { IconSize } from '$lib/types';
	import IconRoot from './IconRoot.svelte';

	let { size }: { size?: IconSize | number } = $props();
</script>

<IconRoot {size}>
	{#snippet children(iconSize: number | string)}
		<svg
			width={iconSize}
			height={iconSize}
			viewBox="0 0 16 16"
			version="1.1"
			xmlns="http://www.w3.org/2000/svg"
			xmlns:xlink="http://www.w3.org/1999/xlink"
			xml:space="preserve"
			style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"
		>
			<g transform="matrix(1.33334,0,0,1.33334,-0.833152,-1.99989)">
				<path
					d="M8.842,3.135C9.043,3.324 9.053,3.64 8.865,3.842L5.435,7.5L8.865,11.158C9.053,11.359 9.043,11.676 8.842,11.865C8.64,12.054 8.324,12.043 8.135,11.842L4.385,7.842C4.205,7.65 4.205,7.35 4.385,7.158L8.135,3.158C8.324,2.956 8.64,2.946 8.842,3.135Z"
				/>
			</g>
		</svg>
	{/snippet}
</IconRoot>
