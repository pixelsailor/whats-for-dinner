<script lang="ts">
  import { Checkbox, Label, type WithoutChildrenOrChild, useId } from 'bits-ui';
  import CheckmarkIcon from '../icons/CheckmarkIcon.svelte';

  let {
    id = useId(),
    checked = $bindable(false),
    ref = $bindable(null),
    labelRef = $bindable(null),
    labelText,
    ...restProps
  }: WithoutChildrenOrChild<Checkbox.RootProps> & {
    labelText: string;
    labelRef?: HTMLLabelElement | null;
  } = $props();
</script>

<Checkbox.Root
  {id}
  class={[
    'border-muted',
    'bg-foreground',
    'data-[state=unchecked]:border-border-input',
    'data-[state=unchecked]:bg-background',
    'data-[state=unchecked]:hover:border-dark-40',
    'peer',
    'inline-flex',
    'size-[25px]',
    'items-center',
    'justify-center',
    'rounded-md',
    'border',
    'transition-all',
    'duration-150',
    'ease-in-out',
    'active:scale-[0.98]'
  ]}
  bind:checked
  bind:ref
  {...restProps}
>
  {#snippet children({ checked, indeterminate })}
    {#if indeterminate}
      <!-- TODO: Add indeterminate icon -->
      <!-- <CheckmarkIcon size="xs" /> -->
    {:else if checked}
      <CheckmarkIcon size="xs" />
    {/if}
  {/snippet}
</Checkbox.Root>
<Label.Root for={id} bind:ref={labelRef} class="label-large">
  {labelText}
</Label.Root>
