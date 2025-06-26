<script lang="ts">
	import type { MouseEventHandler } from 'svelte/elements';

	type ListItemButtonProps = {
		children: any;
    size?: 'two-line' | 'three-line';
		onClick: MouseEventHandler<HTMLButtonElement>;
		[x: string]: any;
	};
	let { children, size = 'two-line', onClick, ...props }: ListItemButtonProps = $props();
</script>

<li class={[{'h-18': size === 'two-line'}, {'h-22': size === 'three-line'}]}>
	<button
		{...props}
		class={['h-full w-full py-2 text-left truncate', {'text-wrap': size === 'three-line'}, props.class]}
		onclick={onClick}
	>
		{@render children()}
	</button>
</li>
