<script lang="ts">
	import { getContext } from 'svelte';

	let { children } = $props();

	let size = getContext('pxl-list');
</script>

<div class="">
	{@render children()}
</div>

