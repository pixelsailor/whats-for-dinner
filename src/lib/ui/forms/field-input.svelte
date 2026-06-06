<script lang="ts">
  /* eslint-disable svelte/no-at-html-tags */
  import type { HTMLInputAttributes } from 'svelte/elements';
  import type { WithElementRef } from 'bits-ui';
  import type FormField from './form-field';

  type InputProps = WithElementRef<
    {
      field: FormField;
      helperText?: string;
      label?: string;
      onblur?: (event: FocusEvent) => void;
      onchange?: (event: Event) => void;
      oninput?: (event: Event) => void;
      onfocus?: (event: FocusEvent) => void;
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
    } & Omit<
      HTMLInputAttributes,
      'value' | 'class' | 'name' | 'pattern' | 'minlength' | 'maxlength' | 'onblur' | 'oninput'
    >,
    HTMLInputElement
  >;

  let {
    field,
    label,
    helperText,
    required,
    ref = $bindable(null),
    type = 'text',
    onblur: onBlurFn,
    onchange: onChangeFn,
    onfocus: onFocusFn,
    oninput: onInputFn,
    ...inputProps
  }: InputProps = $props();

  /** Shown validation message; updated when field validation state changes. */
  let displayError = $derived(field.errors[0]);

  let isInvalid = $derived(field.invalid);
  let isPending = $derived(field.pending);
  let isTouched = $derived(field.touched);
  let isDirty = $derived(field.dirty);
  let isDisabled = $derived(field.disabled);
  let isHidden = $derived(field.hidden);
  let isReadonly = $derived(field.readonly);

  const onblur = (event: FocusEvent) => {
    field.handleBlur(event);
    onBlurFn?.(event);
  };

  const onchange = (event: Event) => {
    field.dirty = true;
    field.handleChange(event);
    onChangeFn?.(event);
  };

  const onfocus = (event: FocusEvent) => {
    field.touched = true;
    field.handleFocus(event);
    onFocusFn?.(event);
  };

  const oninput = (event: Event) => {
    field.dirty = true;
    field.handleInput(event);
    onInputFn?.(event);
  };
</script>

<!--
@component
A text input component with built-in state and validation.

Example:
```svelte
<script lang="ts">
  import FieldInput from '$lib/ui/forms/field-input.svelte';
  let firstName = new FormField<string>({
    name: 'first_name',
    value: '',
    validators: {
      onInput: (value) => value.length < 3 ? 'Minimum 3 characters' : null,
    }
  });
  const myCustomFn = (value: string) => {
    console.log('do something');
  };
</script>

<FieldInput
  bind:field={firstName}
  label="First Name"
  onchange={field.handleChange}
  onblur={(e) => field.handleBlur(e.EventTarget.value)}
  onfocus={(e) => myCustomFn(e.EventTarget.value)}
/>
```
-->
<div class="form-field">
  {#if label}
    <label for={field.name} class="label-large">
      {label}
      {#if required}
        <span class="label-large text-destructive">*</span>
      {/if}
    </label>
  {/if}
  <input
    {type}
    id={field.name}
    name={field.name}
    class={[
      'textinput',
      'body-medium',
      'border-border-input',
      'h-input-mobile',
      'md:h-input',
      'bg-input-bg',
      displayError ? 'border-destructive' : '',
      isInvalid ? 'invalid' : '',
      isPending ? 'pending' : '',
      isTouched ? 'touched' : '',
      isDirty ? 'dirty' : '',
      isDisabled ? 'disabled' : '',
      isHidden ? 'hidden' : '',
      isReadonly ? 'readonly' : '',
    ]}
    bind:this={ref}
    {onblur}
    {onchange}
    {oninput}
    {onfocus}
    disabled={isDisabled}
    hidden={isHidden}
    readonly={isReadonly}
    {...inputProps}
  />
  {#if helperText || displayError}
    <div class="helper-text-container">
      {#if helperText && !displayError}
        <span class="helper-text">{@html helperText}</span>
      {/if}
      {#if displayError}
        <span class="helper-text text-destructive">{displayError}</span>
      {/if}
    </div>
  {/if}
</div>
