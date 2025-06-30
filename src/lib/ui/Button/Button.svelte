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
		primary?: boolean;
		onClick?: MouseEventHandler<HTMLButtonElement>;
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
		shape?: 'round' | 'square';
		title?: string;
		toggle?: boolean;
		type?: 'button' | 'submit' | 'reset';
		sx?: string;
	};

	type ButtonProps =
		| (BaseProps & { label: string; href?: never })
		| (BaseProps & { href: string; label?: string; onClick?: never; type?: never });

	let {
		children,
		cue = 'filled',
		disabled,
		href,
		icon,
		primary = false,
		label,
		onClick,
		size = 'sm',
		shape = 'square',
		title,
		type = 'button',
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

	let cueClasses = $derived.by(() => {
		if (icon) return;

		let rules = {
			elevated: '',
			filled: primary ? 'bg-indigo-300' : 'group-hover:bg-gray-200 group-hover:dark:bg-gray-700',
			tonal: '',
			outlined: primary
				? 'border border-indigo-700'
				: 'border border-gray-500 group-hover:bg-gray-300',
			text: primary
				? 'text-indigo-700'
				: 'text-inherit group-hover:bg-gray-200 group-hover:dark:bg-gray-700'
		};
		return !cue ? rules['text'] : rules[cue];
	});
</script>

{#snippet Base()}
	<div
		class={[
			`pxl-button__content body-compact flex flex-row place-items-center rounded`,
			cueClasses
		]}
		style:height={`${dims[0]}rem`}
		style:padding={`0 ${dims[1]}rem`}
		style:gap={`${dims[2]}rem`}
	>
		{@render children()}
	</div>
{/snippet}

{#snippet Icon()}
	<span class="pxl-button__icon flex" style:width={iconSize} style:height={iconSize}>
		{@render children()}
	</span>
{/snippet}

{#if listElement === 'a'}
	<a
		{...props}
		{href}
		tabindex="0"
		class={[
			'pxl-button',
			{ 'items-center justify-center': icon },
			{ 'justify-center rounded hover:bg-gray-200 hover:dark:bg-gray-700': icon },
			props.class
		]}
		style:min-width={`${BUTTON_MIN_TARGET_HEIGHT_DPI / spacing}rem`}
		style:min-height={`${BUTTON_MIN_TARGET_HEIGHT_DPI / spacing}rem`}
	>
		{#if icon}
			{@render Icon()}
		{:else}
			{@render Base()}
		{/if}
	</a>
{:else}
	<button
		{...props}
		onclick={onClick}
		tabindex="0"
		{title}
		type={type || 'button'}
		aria-label={label}
		class={[
			'pxl-button group hover:cursor-pointer',
			{ 'justify-center rounded hover:bg-gray-200 hover:dark:bg-gray-700': icon },
			props.class
		]}
		style:min-width={`${BUTTON_MIN_TARGET_HEIGHT_DPI / spacing}rem`}
		style:min-height={`${BUTTON_MIN_TARGET_HEIGHT_DPI / spacing}rem`}
		{disabled}
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
	.pxl-button:hover {
		opacity: 0.8;
	}
</style>
