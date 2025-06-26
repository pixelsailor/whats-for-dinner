<script lang="ts">
	type ListItemLinkProps = {
		children: any;
		href: string;
    size?: 'two-line' | 'three-line';
		[x: string]: any;
	};
	let { children, href, size = 'two-line', ...props }: ListItemLinkProps = $props();
</script>

<li class={[{'h-18': size === 'two-line'}, {'h-22': size === 'three-line'}]}>
	<a
		{...props}
		href={href}
		class={['h-full w-full py-2 text-left truncate', {'text-wrap': size === 'three-line'}, props.class]}
	>
		{@render children()}
	</a>
</li>

<style>
	a {
		color: inherit;
		text-decoration: none;
	}
</style>