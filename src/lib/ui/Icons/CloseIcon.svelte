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
			<g transform="matrix(1.09091,0,0,1.09091,-0.181815,-0.181815)">
        <path d="M12.854,2.854C13.049,2.658 13.049,2.342 12.854,2.146C12.658,1.951 12.342,1.951 12.146,2.146L7.5,6.793L2.854,2.146C2.658,1.951 2.342,1.951 2.146,2.146C1.951,2.342 1.951,2.658 2.146,2.854L6.793,7.5L2.146,12.146C1.951,12.342 1.951,12.658 2.146,12.854C2.342,13.049 2.658,13.049 2.854,12.854L7.5,8.207L12.146,12.854C12.342,13.049 12.658,13.049 12.854,12.854C13.049,12.658 13.049,12.342 12.854,12.146L8.207,7.5L12.854,2.854Z"/>
    </g>
		</svg>
	{/snippet}
</IconRoot>
