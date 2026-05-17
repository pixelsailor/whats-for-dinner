<script lang="ts">
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
    } & Omit<HTMLInputAttributes, 'value' | 'required' | 'class' | 'id'>,
    HTMLInputElement
  >;

  let { id, label, required = false, helperText, error, value = $bindable(), ref = $bindable(null), ...inputProps }: InputProps = $props();

  const pid = $props.id();
  let uid = $derived(id ?? pid);
</script>

<!--
@component
A text input component.

-->
<div class="flex flex-col gap-1">
  {#if label}
    <label for={uid} class="label-medium"
      >{label}
      {#if required}
        <span class="label-large text-destructive">*</span>{/if}</label
    >
  {/if}
  <input id={uid} bind:this={ref} bind:value class={['textinput body-medium border-border-input', error ? 'border-destructive' : '']} {...inputProps} />
  {#if helperText && !error}
    <p class="label-small">{helperText}</p>
  {/if}
  {#if error}
    <p class="label-small text-destructive">{error}</p>
  {/if}
</div>
