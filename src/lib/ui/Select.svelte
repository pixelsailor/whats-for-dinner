<script lang="ts">
  import { Select, type WithoutChildren } from 'bits-ui';
  import type { MouseEventHandler } from 'svelte/elements';
  import Button from './button.svelte';
  import CaretDownIcon from './icons/CaretDownIcon.svelte';
  import CaretUpIcon from './icons/CaretUpIcon.svelte';
  import CheckmarkIcon from './icons/CheckmarkIcon.svelte';
  import CloseOutlineIcon from './icons/CloseOutlineIcon.svelte';
  import type { SelectOption } from './types';

  type Props = WithoutChildren<Select.RootProps> & {
    placeholder?: string;
    id?: string;
    items?: SelectOption[];
    contentProps?: WithoutChildren<Select.ContentProps>;
    // any other specific component props if needed
    onReset?: MouseEventHandler<HTMLButtonElement>;
    error?: string;
  };

  let {
    value = $bindable(),
    items,
    contentProps,
    placeholder,
    onReset,
    error,
    onValueChange,
    ...restProps
  }: Props = $props();

  let containerRef = $state<HTMLElement>();

  let selected = $derived(
    items?.find((item) => item.value === value)?.label ?? null
  );

  /** Remove a tag from the selected values. Only available for multiple select. */
  function removeTag(label: string) {
    const next = (value as string[])?.filter((v) => v !== label) ?? [];
    value = next;
    onValueChange?.(next as never);
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
  <button
    type="button"
    class="tag label-medium cursor-pointer"
    onclick={() => removeTag(label)}
  >
    <span>{label}</span>
  </button>
{/snippet}

<Select.Root
  bind:value={value as never}
  {...restProps}
  onValueChange={(v: string | string[]) => {
    onValueChange?.(v as never);
  }}
>
  <div
    class={[
      'body-medium',
      'h-input-mobile md:h-input bg-input',
      'textinput',
      'pl-1',
      'flex',
      'flex-row',
      'flex-nowrap',
      'items-stretch',
      error ? 'border-destructive' : ''
    ]}
    bind:this={containerRef}
  >
    <Select.Trigger
      class="rounded-input inline-flex w-[296px] flex-auto cursor-pointer touch-none items-center border border-none text-sm transition-colors select-none"
    >
      <div class="flex flex-row flex-wrap gap-1">
        {#if restProps.type === 'multiple'}
          {#each value as v (v)}
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
        <Button
          onclick={() => {
            value = [];
            if (restProps.type === 'multiple') {
              onValueChange?.([] as never);
            }
          }}
          class="narrow text inset"
          title="Clear values"
        >
          <CloseOutlineIcon size="xs" />
        </Button>
      </div>
    {/if}
  </div>
  <Select.Portal>
    <Select.Content
      {...contentProps}
      customAnchor={containerRef}
      class={[
        'focus-override',
        'bg-popover',
        'backdrop-blur-xs',
        'shadow-popover',
        'rounded-popover',
        'border',
        'border-muted',
        'data-[state=open]:animate-in',
        'data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0',
        'data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95',
        'data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2',
        'data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2',
        'data-[side=top]:slide-in-from-bottom-2',
        'z-500',
        'min-h-18',
        // 'h-[var(--bits-select-content-available-height)]',
        'max-h-96',
        'w-[var(--bits-select-anchor-width)]',
        'min-w-[var(--bits-select-anchor-width)]',
        'px-1',
        'py-3',
        'outline-hidden',
        'select-none',
        'data-[side=bottom]:translate-y-1',
        'data-[side=left]:-translate-x-1',
        'data-[side=right]:translate-x-1',
        'data-[side=top]:-translate-y-1'
      ]}
    >
      <Select.ScrollUpButton class="flex justify-center">
        <CaretUpIcon size="xs" />
      </Select.ScrollUpButton>
      <Select.Viewport class="p-1">
        {#each items as item (item.value)}
          {#if item.items}
            <Select.Group>
              <Select.GroupHeading
                class="label-medium text-foreground-alt bg-dark-04/50 px-2 py-1 uppercase"
              >
                {item.label}
              </Select.GroupHeading>
              {#each item.items as subItem (subItem.value)}
                <Select.Item
                  value={subItem.value}
                  label={subItem.label}
                  disabled={subItem.disabled}
                  class="data-highlighted:bg-dark-04 h-input-mobile md:h-input body-medium flex w-full cursor-pointer items-center rounded pr-1.5 pl-3 outline-hidden select-none data-disabled:opacity-50"
                >
                  {#snippet children({ selected })}
                    <span class="w-min grow truncate">{subItem.label}</span>
                    {#if selected}
                      <span class="flex-none text-green-500">
                        <CheckmarkIcon size="xs" />
                      </span>
                    {/if}
                  {/snippet}
                </Select.Item>
              {/each}
            </Select.Group>
          {:else}
            <Select.Item
              value={item.value}
              label={item.label}
              disabled={item.disabled}
              class="data-highlighted:bg-dark-04 h-input-mobile md:h-input body-medium flex w-full cursor-pointer items-center rounded pr-1.5 pl-3 outline-hidden select-none data-disabled:opacity-50"
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
          {/if}
        {/each}
      </Select.Viewport>
      <Select.ScrollDownButton class="flex justify-center">
        <CaretDownIcon size="xs" />
      </Select.ScrollDownButton>
    </Select.Content>
  </Select.Portal>
</Select.Root>
