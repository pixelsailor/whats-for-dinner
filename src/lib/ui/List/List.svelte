<script lang="ts">
	import { setContext } from 'svelte';

	type ListProps = {
		children: any;
		truncate?: boolean;
	};
	let { truncate, children, ...props }: ListProps = $props();

	const contextValue = $state({ truncate: false });

	$effect(() => {
		contextValue.truncate = truncate ?? false;
	});

	setContext('pxl-list', contextValue);
</script>

<div class="pxl-list w-full" data-truncate={truncate} {...props}>
	{@render children()}
</div>
