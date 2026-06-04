<script lang="ts">
  /* eslint-disable svelte/no-at-html-tags */
  import type { HTMLInputAttributes } from 'svelte/elements';
  import type { WithElementRef } from 'bits-ui';

  type InputProps = WithElementRef<
    {
      id?: string;
      value: string;
      label?: string;
      helperText?: string;
      required?: boolean;
      error?: string;
      type?:
        | 'text'
        | 'email'
        | 'password'
        | 'number'
        | 'tel'
        | 'url'
        | 'search'
        | 'date'
        | 'time'
        | 'datetime-local'
        | 'month'
        | 'week';
    } & Omit<HTMLInputAttributes, 'value' | 'required' | 'class' | 'id'>,
    HTMLInputElement
  >;

  let {
    id,
    label,
    required = false,
    helperText,
    error,
    value = $bindable(),
    ref = $bindable(null),
    type = 'text',
    ...inputProps
  }: InputProps = $props();

  const pid = $props.id();
  let uid = $derived(id ?? pid);
</script>

<!--
@component
A text input component.

-->
<div class="form-field">
  {#if label}
    <label for={uid} class="label-large"
      >{label}
      {#if required}
        <span class="label-large text-destructive">*</span>{/if}</label
    >
  {/if}
  <input
    {type}
    id={uid}
    bind:this={ref}
    bind:value
    class={['textinput body-medium border-border-input', error ? 'border-destructive' : '']}
    {...inputProps}
  />
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
