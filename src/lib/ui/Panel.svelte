<script lang="ts">
	import type { ClassValue } from 'svelte/elements';

	type PanelProps = {
		bordered?: boolean;
		children: any;
		class?: ClassValue;
		shadow?: boolean;
	};
	let { bordered, children, shadow, ...props }: PanelProps = $props();
</script>

<div
	class={[
		'p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 shadow-xs',
		props.class
	]}
>
	{@render children()}
</div>
