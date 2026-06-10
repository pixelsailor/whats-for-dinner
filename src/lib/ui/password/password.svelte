<script lang="ts">
  /* eslint-disable svelte/no-at-html-tags */
  import { Label, Toggle } from 'bits-ui';
  import ViewIcon from '../icons/View.svelte';
  import ViewOffIcon from '../icons/ViewOff.svelte';
  import type { FormControlStateWithValue, InputFieldProps } from '../form-group/types';

  type Props = InputFieldProps & {
    /** Wrapper `.form-field` element; the `<input>` uses an internal ref. */
    ref?: HTMLElement | null;
    control: FormControlStateWithValue<string>;
    showPassword?: boolean;
  };

  let {
    ref = $bindable(null),
    control = $bindable(),
    name,
    helperText,
    labelText,
    labelRef = $bindable(null),
    showPassword = $bindable(false),
    disabled,
    required: requiredProp,
    requiredText,
    validateOn = 'change',
    minLength,
    maxLength,
    pattern,
    onblur: onBlurFn,
    onchange: onChangeFn,
    onfocus: onFocusFn,
    oninput: onInputFn,
    ...inputProps
  }: Props = $props();

  let inputRef = $state<HTMLInputElement>();

  let valid = $state<boolean | undefined>();

  let invalid = $state<boolean | undefined>();

  let errorMessage = $state<string | undefined>(undefined);

  let touched = $state<boolean | undefined>();
  
  let dirty = $state<boolean | undefined>();

  let pressed = $derived(showPassword);

  let onblur = (event: FocusEvent) => {
    onBlurFn?.(event);
  }

  let onchange = (event: Event) => {
    if (validateOn === 'change') {
      runValidation();
    }
    onChangeFn?.(event);
  }

  let onfocus = (event: FocusEvent) => {
    touched = true;
    if (control) control.touched = true;
    onFocusFn?.(event);
  }

  let oninput = (event: Event) => {
    dirty = true;
    if (control) control.dirty = true;
    if (validateOn === 'input') {
      runValidation();
    }
    onInputFn?.(event);
  }

  function runValidation() {
    let msg: string | null = null;
    for (const fn of [pattern, minLength, maxLength]) {
      if (fn) {
        msg = fn(inputRef?.value ?? '');
        inputRef?.setCustomValidity(msg ?? '');
      }
      if (msg) break;
    }
    setInvalid(!inputRef?.validity.valid);
    setValid(inputRef?.validity.valid ?? false);
    setErrorMessage(inputRef?.validationMessage ?? '');
  }

  function setInvalid(val: boolean) {
    invalid = val;
    if (control) control.invalid = val;
  }

  function setValid(val: boolean) {
    valid = val;
    if (control) control.valid = val;
  }

  function setErrorMessage(msg: string) {
    errorMessage = inputRef?.validationMessage ?? undefined;
    if (control) control.error = msg;
  }
</script>

<!--
@component
A password input component with optional built-in validators.

Validation does not run until the configured interaction event fires (`validateOn`, default `blur`).
Pass `oninput` / `onblur` to hook the same events without replacing value binding.

Example:
```svelte
<Password name="password" bind:value={password} required />
```

Minimum length validator:
```svelte
<Password name="password" bind:value={password} validateOn="input" minLength={(v) => v.length < 3 ? 'Minimum 3 characters' : null} />
```
-->
<div
  bind:this={ref}
  class="form-field"
  data-valid={valid}
  data-invalid={invalid}
  data-touched={touched}
  data-dirty={dirty}
  data-disabled={disabled}
>
  <Label.Root for={name} bind:ref={labelRef} class="label-large">
    {labelText}
    {#if requiredProp || requiredText}
      <span class="label-large text-destructive">*</span>
    {/if}
  </Label.Root>
  <div class={['input-group', invalid ? 'invalid' : '',]}>
    <input
      type={pressed ? 'text' : 'password'}
      id={name}
      {name}
      bind:this={inputRef}
      bind:value={control.value}
      class="textinput body-medium"
      {onblur}
      {onchange}
      {oninput}
      {onfocus}
      required={requiredText ? true : requiredProp ? true : undefined}
      {disabled}
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
  {#if helperText || errorMessage}
    <div class="helper-text-container">
      {#if helperText && !errorMessage}
        <span class="helper-text">{@html helperText}</span>
      {/if}
      {#if errorMessage}
        <span class="helper-text text-destructive">{errorMessage}</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  :global(.input-group:has(input:is(:autofill, :-webkit-autofill))) {
    background-color: -moz-autofill-background;
  }
</style>