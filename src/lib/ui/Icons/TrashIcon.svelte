<script lang="ts">
	import IconRoot, { type IconSize } from './IconRoot.svelte';

	let { size }: { size?: IconSize | number } = $props();
</script>

<IconRoot {size}>
	{#snippet children(iconSize: number | string)}
		<svg
			width={iconSize}
			height={iconSize}
			viewBox="0 0 16 16"
			xmlns="http://www.w3.org/2000/svg"
			style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;"
		>
			<g transform="matrix(1,0,0,1,0,1)">
				<path
					d="M5.5,0C5.224,0 5,0.224 5,0.5C5,0.776 5.224,1 5.5,1L10.5,1C10.776,1 11,0.776 11,0.5C11,0.224 10.776,0 10.5,0L5.5,0ZM3,2.5C3,2.224 3.224,2 3.5,2L12.5,2C12.776,2 13,2.224 13,2.5C13,2.776 12.776,3 12.5,3L12,3L12,13C12,13.552 11.552,14 11,14L5,14C4.448,14 4,13.552 4,13L4,3L3.5,3C3.224,3 3,2.776 3,2.5ZM5,3L11,3L11,13L5,13L5,3Z"
				/>
			</g>
		</svg>
	{/snippet}
</IconRoot>
