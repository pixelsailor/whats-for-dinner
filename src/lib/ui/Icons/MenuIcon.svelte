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
			fill="currentColor"
		>
			<g transform="matrix(1.07692,0,0,1.11111,-0.0769231,-0.333333)">
				<path
					d="M1.5,3C1.224,3 1,3.224 1,3.5C1,3.776 1.224,4 1.5,4L13.5,4C13.776,4 14,3.776 14,3.5C14,3.224 13.776,3 13.5,3L1.5,3ZM1,7.5C1,7.224 1.224,7 1.5,7L13.5,7C13.776,7 14,7.224 14,7.5C14,7.776 13.776,8 13.5,8L1.5,8C1.224,8 1,7.776 1,7.5ZM1,11.5C1,11.224 1.224,11 1.5,11L13.5,11C13.776,11 14,11.224 14,11.5C14,11.776 13.776,12 13.5,12L1.5,12C1.224,12 1,11.776 1,11.5Z"
				/>
			</g>
		</svg>
	{/snippet}
</IconRoot>
