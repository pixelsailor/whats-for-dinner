<script lang="ts">
	import { Button } from 'bits-ui';

	type BButtonProps = {
		children: any;
		outlined?: boolean;
		text?: boolean;
		elevated?: boolean;
		[x: string]: any;
	};

	let { children, class: className, outlined, text, elevated, ...props }: BButtonProps = $props();
</script>

<!--
@component
# BButton
A custom button component that provides a consistent styling and behavior for buttons.

@deprecated @see [Button](https://bits-ui.com/docs/components/button/llms.txt) and combine with
appropriate what's for dinner button styles.
-->
<Button.Root
	class="rounded-input bg-dark text-background shadow-mini hover:bg-dark/95 inline-flex
  h-10 cursor-pointer items-center justify-center px-3
  text-[15px] font-semibold active:scale-[0.98] active:transition-all"
>
	{@render children()}
</Button.Root>
