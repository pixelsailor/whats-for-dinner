<script lang="ts">
	import { getContext } from 'svelte';
	import type { MouseEventHandler } from 'svelte/elements';

	type ListItemLinkProps = {
		children: any;
		onClick: MouseEventHandler<HTMLButtonElement>;
		label?: string;
	};
	let { children, onClick, label, ...props }: ListItemLinkProps = $props();

	let size = getContext('pxl-list');
</script>

<button
	{...props}
	class={[
		'pxl-listitem__link flex h-full w-full flex-row items-center gap-3 pl-4',
		{ 'place-content-center gap-4': size === 'two-line' },
		{ 'place-content-start gap-4': size === 'three-line' }
	]}
	onclick={onClick}
	aria-label={label}
>
	{@render children()}
</button>
