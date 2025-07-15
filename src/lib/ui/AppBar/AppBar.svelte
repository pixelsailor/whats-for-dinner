<script lang="ts">
	import type { Viewport } from '$lib/types';
	import { getContext } from 'svelte';
	import Button from '../Button/Button.svelte';
	import OpenPanelLeftIcon from '../Icons/OpenPanelLeftIcon.svelte';

	const vp: Viewport = getContext('viewport');

	let { children = null, disableMobileNav = false } = $props();

	let isMobile = $derived(vp.device === 'mobile');

	function toggleMobileNav() {
		vp.nav = vp.nav === 'expanded' ? 'collapsed' : 'expanded';
	}
</script>

<div class="flex w-full flex-col px-2 backdrop-blur-sm">
	<div class="flex h-16 flex-row items-center py-2">
		{#if isMobile && !disableMobileNav}
			<Button
				title="Show navigation"
				onClick={toggleMobileNav}
				label="Show navigation"
				size="xs"
				icon
			>
				<OpenPanelLeftIcon />
			</Button>
		{/if}
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>
