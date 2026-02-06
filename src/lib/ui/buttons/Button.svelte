<script lang="ts">
	import { Button } from 'bits-ui';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type ButtonProps = {
		children: any;
		outlined?: boolean;
		text?: boolean;
		raised?: boolean;
		[x: string]: any;
	};

	let { children, class: className, outlined, text, raised, ...props }: ButtonProps = $props();
</script>

<Button.Root
	class="rounded-input bg-dark text-background shadow-mini hover:bg-dark/95 inline-flex
  h-10 cursor-pointer items-center justify-center px-3
  text-[15px] font-semibold active:scale-[0.98] active:transition-all"
>
	{@render children()}
</Button.Root>
