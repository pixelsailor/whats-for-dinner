<script lang="ts">
  /* eslint-disable svelte/no-at-html-tags */
  import type { HTMLTextareaAttributes } from 'svelte/elements';
  import { Label, type WithElementRef } from 'bits-ui';
  import type { FormControlStateWithValue } from '../form-group/types';
  import { onMount } from 'svelte';

  type Props = WithElementRef<
    {
      control?: FormControlStateWithValue<string> | undefined;
      value?: string | undefined;
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
    } & Omit<
      HTMLTextareaAttributes,
      | 'id'
      | 'value'
      | 'pattern'
      | 'minlength'
      | 'maxlength'
      | 'onblur'
      | 'oninput'
    >,
    HTMLTextAreaElement
  >;

  let {
    control = $bindable(),
    value = $bindable(),
    name,
    labelText,
    labelRef = $bindable(null),
    helperText,
    class: className,
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

  let inputRef = $state<HTMLTextAreaElement>();

  let valid = $state<boolean | undefined>();

  let invalid = $state<boolean | undefined>();

  let errorMessage = $state<string | undefined>(undefined);

  let touched = $state<boolean | undefined>();

  let dirty = $state<boolean | undefined>();

  onMount(() => {
    if (getInputValue() !== '') {
      runValidation();
    }
  });

  let onblur = (event: FocusEvent) => {
    onBlurFn?.(event);
  };

  let onchange = (event: Event) => {
    if (validateOn === 'change') {
      runValidation();
    }
    onChangeFn?.(event);
  };

  let onfocus = (event: FocusEvent) => {
    touched = true;
    if (control) control.touched = true;
    onFocusFn?.(event);
  };

  let oninput = (event: Event) => {
    dirty = true;
    if (control) control.dirty = true;
    if (validateOn === 'input') {
      runValidation();
    }
    onInputFn?.(event);
  };

  function getInputValue(): string {
    return control?.value ?? value ?? '';
  }

  function setInputValue(nextValue: string) {
    value = nextValue;
    if (control) {
      control.value = nextValue;
    }
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
A textarea component with built in accessibility and optional validation.
`Textarea` uses the `name` attribute to identify the formData element as well as to generate the `id` and `for` attributes for the label.

Validation does not run until the configured interaction event fires (`validateOn`, default `change`).
Pass `oninput` / `onblur` to hook the same events without replacing value binding.

Basic example:
```svelte
<Textarea name="message" labelText="Message" />
```

Example with `value`:
```svelte
<Textarea name="message" labelText="Message" bind:value={message} />
```

Example with `control` (requires `FormGroup`):
```svelte
<script>
  const formGroup = new FormGroup({
    message: '',
  });
</script>
<Textarea name="message" labelText="Message" control={formGroup.controls.message} />
```
-->
<div
  class="form-field stretch"
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
  <textarea
    bind:this={inputRef}
    bind:value={getInputValue, setInputValue}
    id={name}
    {name}
    {onblur}
    {onchange}
    {oninput}
    {onfocus}
    required={requiredText ? true : requiredProp ? true : undefined}
    {disabled}
    class={['textinput', 'body-medium', className, invalid ? 'invalid' : '']}
    {...inputProps}></textarea>
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
