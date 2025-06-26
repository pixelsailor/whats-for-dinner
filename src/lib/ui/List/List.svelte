<script lang="ts">
	import { setContext } from 'svelte';

	type ListProps = {
		children: any;
		size?: 'two-line' | 'three-line';
		type?: 'ordered' | 'unordered';
	};
	let { size = 'two-line', type = 'unordered', children, ...props }: ListProps = $props();

	setContext('pxl-list', size);

	let listElement = $derived(type === 'ordered' ? 'ol' : 'ul');
</script>

<svelte:element this={listElement} class="pxl-list my-1" {...props}>
	{@render children()}
</svelte:element>
