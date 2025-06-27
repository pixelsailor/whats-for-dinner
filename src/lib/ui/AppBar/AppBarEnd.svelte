<script lang="ts">
	let { children } = $props();
</script>

<div class="w-content flex flex-row flex-none">
	{@render children()}
</div>
