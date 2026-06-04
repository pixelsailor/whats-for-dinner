<script lang="ts">
  /* eslint-disable svelte/no-at-html-tags */
  import { Label, Toggle, type WithElementRef, useId } from 'bits-ui';
  import type { HTMLInputAttributes } from 'svelte/elements';
  import ViewIcon from '../icons/View.svelte';
  import ViewOffIcon from '../icons/ViewOff.svelte';

  type Props = WithElementRef<HTMLInputAttributes> & {
    helperText?: string;
    error?: string;
    id?: string;
    labelText: string;
    labelRef?: HTMLLabelElement | null;
    ref?: HTMLInputElement | null;
    showPassword?: boolean;
  };

  let {
    error,
    helperText,
    id = useId(),
    labelText,
    labelRef = $bindable(null),
    ref = $bindable(null),
    showPassword = $bindable(false),
    value = $bindable(),
    ...inputProps
  }: Props = $props();

  let pressed = $derived(showPassword);
</script>

<div class="form-field">
  <Label.Root for={id} bind:ref={labelRef} class="label-large">
    {labelText}
  </Label.Root>
  <div class="input-group">
    <input
      type={pressed ? 'text' : 'password'}
      {id}
      bind:this={ref}
      bind:value
      class={['textinput body-medium border-border-input', error ? 'border-destructive' : '']}
      {...inputProps}
    />
    <Toggle.Root
      aria-label="Toggle password visibility"
      class="button text narrow"
      bind:pressed={showPassword}
    >
      {#if pressed}
        <ViewIcon size="sm" />
      {:else}
        <ViewOffIcon size="sm" />
      {/if}
    </Toggle.Root>
  </div>
  {#if helperText}
    <div class="helper-text-container">
      {#if helperText && !error}
        <span class="helper-text">{@html helperText}</span>
      {/if}
      {#if error}
        <span class="helper-text text-destructive">{error}</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  :global(.input-group:has(input:is(:autofill, :-webkit-autofill))) {
    background-color: -moz-autofill-background;
  }
</style>