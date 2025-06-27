<script lang="ts">
	import { BUTTON_MIN_TARGET_HEIGHT } from '$lib/constants';
	import type { MouseEventHandler } from 'svelte/elements';

	type IconButtonProps = {
		title: string;
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
		onClick: MouseEventHandler<HTMLButtonElement>;
		children: any;
		[x: string]: any;
	};

	let { title, size = 'sm', onClick, children, ...props }: IconButtonProps = $props();

	let iconSize = $derived.by(() => {
    const sizes = {
      xs: 16,
      sm: 20,
      md: 24,
      lg: 32,
      xl: 40
    };
    return `${sizes[size]}px`;
	});
</script>

<button
	class={['button icon-button', props.class]}
	style:min-width={`${BUTTON_MIN_TARGET_HEIGHT / 4}rem`}
	style:height={`${BUTTON_MIN_TARGET_HEIGHT / 4}rem`}
	style={props.style}
	onclick={onClick}
	disabled={props.disabled}
	title={props.title}
>
	<span class="icon-button__icon" style:width={iconSize} style:height={iconSize}>
		{@render children()}
	</span>
	<span class="sr-only">{title}</span>
</button>

<style>
	.icon-button {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.icon-button:disabled {
		opacity: 0.7;
	}

	.icon-button__icon {
		display: flex;
	}
</style>
