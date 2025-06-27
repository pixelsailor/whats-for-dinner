<script lang="ts">
	import { BUTTON_MIN_TARGET_HEIGHT_DPI } from '$lib/constants';
	import type { IconSize } from '$lib/types';
	import type { ClassValue, MouseEventHandler } from 'svelte/elements';

	type BaseProps = {
		children: any;
		class?: ClassValue;
		cue?: 'elevated' | 'filled' | 'tonal' | 'outlined' | 'text';
		disabled?: boolean;
		icon?: boolean;
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
		shape?: 'round' | 'square';
		title?: string;
		type?: 'default' | 'toggle';
		sx?: string;
	};

	type ButtonProps =
		| (BaseProps & { label: string; onClick: MouseEventHandler<HTMLButtonElement>; href?: never })
		| (BaseProps & { href: string; label?: string; onClick?: never });

	let {
		children,
		cue = 'filled',
		disabled,
		href,
		icon,
		label,
		onClick,
		size = 'sm',
		shape = 'square',
		title,
		type = 'default',
		sx,
		...props
	}: ButtonProps = $props();

	// convert Google Material DPI to rems -- this is different than TW where 4 === 1rem
	const spacing = 16;

	let listElement = $derived(href ? 'a' : 'button');

	let dims = $derived.by<number[]>(() => {
		// Values are in dpi per Google Material guidelines.
		// First is height, followed by x-padding, then gap
		const dpiSizes = {
			xs: [32, 12, 4],
			sm: [40, 16, 8],
			md: [56, 24, 8],
			lg: [96, 48, 12],
			xl: [136, 64, 16]
		};
		return dpiSizes[size as IconSize].map((n) => n / spacing);
	});

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

{#snippet Base()}
	<span
			class="pxl-button__content"
			style:height={`${dims[0]}rem`}
			style:padding={`0 ${dims[1]}rem`}
			style:gap={`${dims[2]}rem`}
		>
			{@render children()}
		</span>
{/snippet}

{#snippet Icon()}
	<span
			class="pxl-button__icon flex"
			style:width={iconSize}
			style:height={iconSize}
		>
			{@render children()}
		</span>
{/snippet}

{#if listElement === 'a'}
	<a
		{href}
		tabindex="0"
		class={['pxl-button', {'justify-center items-center': icon}, props.class]}
		style:min-width={`${BUTTON_MIN_TARGET_HEIGHT_DPI / spacing}rem`}
		style:min-height={`${BUTTON_MIN_TARGET_HEIGHT_DPI / spacing}rem`}
		{...props}
	>
		{#if icon}
			{@render Icon()}
		{:else}
			{@render Base()}
		{/if}
	</a>
{:else}
	<button
		onclick={onClick}
		tabindex="0"
		{title}
		aria-label={label}
		class={['pxl-button', {'justify-center': icon}, props.class]}
		style:min-width={`${BUTTON_MIN_TARGET_HEIGHT_DPI / spacing}rem`}
		style:min-height={`${BUTTON_MIN_TARGET_HEIGHT_DPI / spacing}rem`}
		{disabled}
		{...props}
	>
		{#if icon}
			{@render Icon()}
		{:else}
			{@render Base()}
		{/if}
	</button>
{/if}

<style>
	.pxl-button {
		display: flex;
		place-items: center;
	}
	.pxl-button__content {
		display: flex;
		flex-direction: row;
	}
</style>
