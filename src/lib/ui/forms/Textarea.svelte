<script lang="ts">
  import type { WithChildren, WithElementRef } from 'bits-ui';
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  type TextareaProps = WithElementRef<
    {
      id?: string;
      value: string;
      label?: string;
      required?: boolean;
      placeholder?: string;
      error?: string;
    } & Omit<HTMLTextareaAttributes, 'value' | 'class' | 'required' | 'id'>,
    HTMLTextAreaElement
  >;

  let {
    children,
    id,
    name,
    value = $bindable(),
    label,
    required = false,
    placeholder = '',
    error,
    ref = $bindable(null),
    ...restProps
  }: WithChildren<TextareaProps> = $props();

  const pid = $props.id();
  let uid = $derived(id ?? pid);

  // Auto-resize textarea to fit content up to max-height
  function autoResize(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 420) + 'px';
  }
</script>

<!--
@component
A textarea component incorporating a label and wrapping form field.

-->
<div class="flex flex-col gap-1">
  {#if label}
    <label for={uid} class="label-large"
      >{label}
      {#if required}
        <span class="label-large text-destructive">*</span>{/if}</label
    >
  {/if}
  <textarea
    bind:this={ref}
    id={uid}
    {name}
    {placeholder}
    oninput={autoResize}
    {required}
    bind:value
    class={['textarea body-medium border-border-input field-sizing-content', error ? 'border-destructive' : '']}
    {...restProps}
  ></textarea>
  {@render children?.()}
</div>
