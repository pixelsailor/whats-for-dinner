<script lang="ts">
	import { Button, Select, type WithoutChildren } from 'bits-ui';
	import type { MouseEventHandler } from 'svelte/elements';
	// import Button from './Button/Button.svelte';
	import CaretDownIcon from './icons/CaretDownIcon.svelte';
	import CaretUpIcon from './icons/CaretUpIcon.svelte';
	import CheckmarkIcon from './icons/CheckmarkIcon.svelte';
	import CloseOutlineIcon from './icons/CloseOutlineIcon.svelte';
	import type { SelectOption } from './types';

	type Props = WithoutChildren<Select.RootProps> & {
		placeholder?: string;
		items?: SelectOption[];
		contentProps?: WithoutChildren<Select.ContentProps>;
		// any other specific component props if needed
		onReset?: MouseEventHandler<HTMLButtonElement>;
	};

	let {
		value = $bindable(),
		items,
		contentProps,
		placeholder,
		onReset,
		...restProps
	}: Props = $props();

	let containerRef = $state<HTMLElement>();

	let selected = $derived(items?.find((item) => item.value === value)?.label ?? null);

  /** Remove a tag from the selected values. Only available for multiple select. */
  function removeTag(label: string) {
    value = (value as string[])?.filter((v) => v !== label) ?? [];
  }
</script>

<!--
@component
# PxlSelect
ui-bits based select component

_Reference: bits-ui [Select](https://bits-ui.com/docs/components/select/llms.txt)_

## Usage
- Basic Usage
```html
<PxlSelect bind:value={value} items={items} />
```
-->
{#snippet tag(label: string)}
  <Button.Root class="tag label-medium cursor-pointer" onclick={() => removeTag(label)}>
    <span>{label}</span>
  </Button.Root>
{/snippet}

<Select.Root bind:value={value as never} {...restProps}>
	<div
		class="body-medium my-1 flex h-input flex-row flex-nowrap items-stretch rounded-sm border border-border-input dark:border-gray-700 bg-background dark:bg-gray-900"
		bind:this={containerRef}
	>
		<Select.Trigger
			class="h-input flex-auto border-none data-placeholder:text-foreground-alt/50 inline-flex w-[296px] touch-none select-none items-center border px-[11px] text-sm transition-colors cursor-pointer"
		>
			<div class="flex flex-row flex-wrap gap-1">
        {#if restProps.type === 'multiple'}
          {#each value as v}
            {@render tag(v)}
          {/each}
        {:else}
          {selected}
        {/if}
				{#if !value || value.length === 0}
					<span class="body-medium text-foreground-alt/50">{placeholder}</span>
				{/if}
      </div>
		</Select.Trigger>
		{#if value && value.length > 0}
			<div class="flex-none">
				<Button.Root onclick={() => (value = [])} class="button narrow text inset" title="Clear values">
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
				{#each items as item}
					<Select.Item
						value={item.value}
            label={item.label}
            disabled={item.disabled}
						class="rounded-button data-highlighted:bg-muted outline-hidden data-disabled:opacity-50 flex h-10 w-full select-none items-center py-3 pl-3 pr-1.5 text-sm cursor-pointer"
					>
						{#snippet children({ selected })}
							<span class="w-min grow truncate">{item.label}</span>
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
