<script lang="ts">
	import { getContext } from 'svelte';

	type ListItemLinkProps = {
		children: any;
		href: string;
	};
	let { children, href, ...props }: ListItemLinkProps = $props();

	let size = getContext('pxl-list');
</script>

<a
	{href}
	class={[
		'pxl-listitem__link flex h-full w-full flex-row',
		{ 'place-content-center': size === 'two-line' },
		{ 'place-content-start': size === 'three-line' }
	]}
	{...props}
>
	{@render children()}
</a>

<style>
	a {
		color: inherit;
		text-decoration: none;
	}
</style>
