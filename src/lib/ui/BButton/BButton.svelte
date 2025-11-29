<script lang="ts">
	import { Button } from 'bits-ui';

	type BButtonProps = {
		children: any;
		[x: string]: any;
	};

	let { children, class: className, ...props }: BButtonProps = $props();
</script>

<Button.Root
  class="rounded-input bg-dark text-background shadow-mini hover:bg-dark/95 inline-flex
  h-12 items-center justify-center px-[21px] text-[15px]
  font-semibold active:scale-[0.98] active:transition-all"
>
  {@render children()}
</Button.Root>