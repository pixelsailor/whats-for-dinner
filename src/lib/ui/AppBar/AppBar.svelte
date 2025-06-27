<script>
	let { children } = $props();
</script>

<header class="sticky flex w-full flex-col px-1">
	<div class="flex h-16 flex-row items-center py-2">
		{@render children()}
	</div>
</header>
