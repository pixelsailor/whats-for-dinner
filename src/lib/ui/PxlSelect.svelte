<script lang="ts">
	import { Select, type WithoutChildren } from 'bits-ui';
	import Button from './Button/Button.svelte';
	import CloseOutlineIcon from './Icons/CloseOutlineIcon.svelte';
	import type { MouseEventHandler } from 'svelte/elements';
	import CaretDownIcon from './Icons/CaretDownIcon.svelte';
	import CaretUpIcon from './Icons/CaretUpIcon.svelte';
	import CheckmarkIcon from './Icons/CheckmarkIcon.svelte';

	type Props = WithoutChildren<Select.RootProps> & {
		placeholder?: string;
		// items: { value: string; label: string; disabled?: boolean }[];
		sItems: string[];
		contentProps?: WithoutChildren<Select.ContentProps>;
		// any other specific component props if needed
		onReset?: MouseEventHandler<HTMLButtonElement>;
	};

	let {
		value = $bindable(),
		sItems,
		contentProps,
		placeholder,
		onReset,
		...restProps
	}: Props = $props();

	const selectedLabel = $derived(value?.toString());

	let containerRef = $state<HTMLElement>();
</script>

<Select.Root bind:value={value as never} {...restProps}>
	<div
		class="label my-1 flex h-12 w-full flex-row flex-nowrap items-stretch rounded-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-900"
		bind:this={containerRef}
	>
		<Select.Trigger class="grow px-4 py-1 hover:cursor-pointer hover:dark:bg-gray-800">
			<div class="text-left">{selectedLabel}</div>
		</Select.Trigger>
		{#if value && value.length > 0}
			<div class="flex-none" style="margin-top: -1px;">
				<Button size="xs" onClick={onReset} label="Clear values" icon>
					<CloseOutlineIcon />
				</Button>
			</div>
		{/if}
	</div>
	<Select.Portal>
		<Select.Content
			{...contentProps}
			customAnchor={containerRef}
			class="focus-override z-50 h-96 max-h-[var(--bits-select-content-available-height)] w-[var(--bits-select-anchor-width)] w-full min-w-[var(--bits-select-anchor-width)] rounded-sm border p-1 shadow-md select-none data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1 dark:border-gray-700 dark:bg-gray-900"
		>
			<Select.ScrollUpButton class="flex justify-center">
				<CaretUpIcon size="xs" />
			</Select.ScrollUpButton>
			<Select.Viewport class="p-1">
				{#each sItems as item}
					<Select.Item
						value={item}
						class="label flex h-10 w-full flex-nowrap items-center justify-between rounded-sm px-2 hover:cursor-pointer hover:bg-gray-600 focus:bg-gray-600 active:bg-gray-600 data-highlighted:bg-gray-600"
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
