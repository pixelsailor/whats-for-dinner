<script lang="ts">
	import { Button, Select, type WithoutChildren } from 'bits-ui';
	// import Button from './Button/Button.svelte';
	import CloseOutlineIcon from './Icons/CloseOutlineIcon.svelte';
	import type { MouseEventHandler } from 'svelte/elements';
	import CaretDownIcon from './Icons/CaretDownIcon.svelte';
	import CaretUpIcon from './Icons/CaretUpIcon.svelte';
	import CheckmarkIcon from './Icons/CheckmarkIcon.svelte';

	type Props = WithoutChildren<Select.RootProps> & {
		placeholder?: string;
		// items: { value: string; label: string; disabled?: boolean }[];
		items?: ({ value: string; label: string; disabled?: boolean } | string)[];
		sItems: string[];
		contentProps?: WithoutChildren<Select.ContentProps>;
		// any other specific component props if needed
		onReset?: MouseEventHandler<HTMLButtonElement>;
	};

	let {
		value = $bindable(),
		items,
		sItems,
		contentProps,
		placeholder,
		onReset,
		...restProps
	}: Props = $props();

	const selectedLabel = $derived(value?.toString().trim().split(',').join(', ') ?? '');

	let containerRef = $state<HTMLElement>();
</script>

<!--
@component
# PxlSelect
ui-bits based select component

_Reference: bits-ui [Select](https://bits-ui.com/docs/components/select/llms.txt)_

## Usage
- Basic Usage
```html
<PxlSelect bind:value={value} sItems={sItems} />
```
-->
<Select.Root bind:value={value as never} {...restProps}>
	<div
		class="body-medium my-1 flex h-input flex-row flex-nowrap items-stretch rounded-sm border border-border-input dark:border-gray-700 bg-background dark:bg-gray-900"
		bind:this={containerRef}
	>
		<Select.Trigger
			class="h-input flex-auto border-none data-placeholder:text-foreground-alt/50 inline-flex w-[296px] touch-none select-none items-center border px-[11px] text-sm transition-colors cursor-pointer"
		>
			<div class="text-left">{selectedLabel}</div>
		</Select.Trigger>
		{#if value && value.length > 0}
			<div class="flex-none" style="margin-top: -1px;">
				<Button.Root onclick={onReset} class="button narrow text" title="Clear values">
					<CloseOutlineIcon size="xs" />
				</Button.Root>
			</div>
		{/if}
	</div>
	<Select.Portal>
		<Select.Content
			{...contentProps}
			customAnchor={containerRef}
			class="focus-override border-muted bg-background shadow-popover data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 outline-hidden z-500 h-96 max-h-[var(--bits-select-content-available-height)] w-[var(--bits-select-anchor-width)] min-w-[var(--bits-select-anchor-width)] select-none rounded-xl border px-1 py-3 data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1"
		>
			<Select.ScrollUpButton class="flex justify-center">
				<CaretUpIcon size="xs" />
			</Select.ScrollUpButton>
			<Select.Viewport class="p-1">
				{#each sItems as item}
					<Select.Item
						value={item}
						class="rounded-button data-highlighted:bg-muted outline-hidden data-disabled:opacity-50 flex h-10 w-full select-none items-center py-3 pl-3 pr-1.5 text-sm capitalize cursor-pointer"
					>
						{#snippet children({ selected })}
							<span class="w-min grow truncate">{item}</span>
							{#if selected}
								<span class="flex-none text-green-500">
									<CheckmarkIcon size="xs" />
								</span>
							{/if}
						{/snippet}
					</Select.Item>
				{/each}
			</Select.Viewport>
			<Select.ScrollDownButton class="flex justify-center">
				<CaretDownIcon size="xs" />
			</Select.ScrollDownButton>
		</Select.Content>
	</Select.Portal>
</Select.Root>
