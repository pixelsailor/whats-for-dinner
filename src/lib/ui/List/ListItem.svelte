<script lang="ts">
	import { getContext } from 'svelte';

	let { children } = $props();

	let size = getContext('pxl-list');
</script>

<li
	class={[
		'pxl--listitem flex flex-row flex-nowrap',
		{ 'h-18': size === 'two-line' },
		{ 'h-22': size === 'three-line' }
	]}
>
  {@render children()}
</li>
