<script lang="ts">
  /* eslint-disable svelte/no-at-html-tags */
  import type { HTMLInputAttributes } from 'svelte/elements';
  import { Label, type WithElementRef } from 'bits-ui';
  import type { FormControlState } from '../form/types';

  type TextInputProps = WithElementRef<
    {
      name: string;
      control: FormControlState<string>;
      labelText?: string | undefined;
      labelRef?: HTMLLabelElement | null;
      helperText?: string | undefined;
      requiredText?: string | undefined;
      validateOn?: 'input' | 'change';
      minLength?: (value: string) => string | null;
      maxLength?: (value: string) => string | null;
      pattern?: (value: string) => string | null;
      onblur?: (event: FocusEvent) => void;
      onchange?: (event: Event) => void;
      onfocus?: (event: FocusEvent) => void;
      oninput?: (event: Event) => void;
    } & Omit<HTMLInputAttributes, 'value' | 'class' | 'name' | 'pattern' | 'minlength' | 'maxlength' | 'onblur' | 'oninput'>,
    HTMLInputElement
  >;

  let {
    control = $bindable(),
    type = 'text',
    name,
    labelText,
    labelRef = $bindable(null),
    helperText,
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
  }: TextInputProps = $props();

  let inputRef = $state<HTMLInputElement>();

  let valid = $state<boolean | undefined>();

  let invalid = $state<boolean | undefined>();

  let errorMessage = $state<string | undefined>(undefined);

  let touched = $state<boolean | undefined>();

  let dirty = $state<boolean | undefined>();

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

<div
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
  <input
    bind:this={inputRef}
    bind:value={control.value}
    {type}
    id={name}
    {name}
    {onblur}
    {onchange}
    {oninput}
    {onfocus}
    required={requiredText ? true : requiredProp ? true : undefined}
    {disabled}
    class={[
      'textinput',
      'border border-border-input shadow-mini',
      'body-medium',
      invalid ? 'invalid' : '',
    ]}
    {...inputProps}
  />
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