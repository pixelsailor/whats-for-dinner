<script lang="ts">
	import { getContext } from 'svelte';

	let { children } = $props();

	let size = getContext('pxl-list');
</script>

<li
	class={[
		'pxl-listitem flex flex-row flex-nowrap text-sm w-full',
		{ 'h-14': !size },
		{ 'h-18': size === 'two-line' },
		{ 'h-22': size === 'three-line' }
	]}
>
  {@render children()}
</li>
