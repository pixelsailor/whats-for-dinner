<script lang="ts">
	let { children } = $props();
</script>

<div class="w-content flex flex-row flex-none gap-1 items-center ml-auto -mr-3">
	{@render children()}
</div>
