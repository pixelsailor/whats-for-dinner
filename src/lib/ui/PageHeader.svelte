<script lang="ts">
	import { getContext } from 'svelte';

	const vp: any = getContext('viewport');

	let { children } = $props();

	let left = $derived.by(() => {
		if (vp.device === 'mobile') return '0';
		return vp.nav === 'expanded' ? 'calc(18rem + 1px)' : 'calc(3.5rem + 1px)';
	});
</script>

<div class="background-blur-sm fixed top-0 right-0" style:left>
	{@render children()}
</div>
