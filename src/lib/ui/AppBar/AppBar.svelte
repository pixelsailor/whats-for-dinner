<script>
	let { children } = $props();
</script>

<div class="flex w-full flex-col px-1 backdrop-blur-sm">
	<div class="flex h-16 flex-row items-center py-2">
		{@render children()}
	</div>
</div>
