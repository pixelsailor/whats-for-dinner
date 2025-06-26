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
		'flex h-full w-full flex-row py-2',
		{ 'content-center': size === 'two-line' },
		{ 'content-start': size === 'three-line' }
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
