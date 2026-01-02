<script lang="ts">
	import { getContext } from 'svelte';

	const vp: any = getContext('viewport');

	let { children } = $props();

	let left = $derived.by(() => {
		if (vp.device === 'mobile') return '0';
		// return vp.nav === 'expanded' ? 'calc(18rem + 1px)' : 'calc(3.75rem + 1px)';
		return 'auto';
	});
</script>

<!--
@component PageHeader

Structural component for placing items at the top of the page.
-->
<div class="background-blur-sm sticky top-0 right-0 px-5 z-100" style:left>
	{@render children()}
</div>
