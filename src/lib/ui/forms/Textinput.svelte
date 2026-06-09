<script lang="ts">
  /* eslint-disable svelte/no-at-html-tags */
  import type { HTMLInputAttributes } from 'svelte/elements';
  import type { WithElementRef } from 'bits-ui';

  /**
   * A validator function that returns a string if the value is invalid, otherwise null.
   * @param value - The value to validate.
   * @returns A string if the value is invalid, otherwise null.
   * @example
   * const validator: Validator = (value) => {
   *   if (value.length < 3) {
   *     return 'Minimum 3 characters';
   *   }
   *   return null;
   * };
  */
  type Validator<T> = (value: T) => null | string;

  /** When built-in validators run and surface errors. */
  type ValidateOn = 'input' | 'blur' | 'both';

  type InputProps = WithElementRef<
    {
      name: string;
      value: string;
      helperText?: string;
      label?: string;
      /** When `pattern`, `minlength`, or `maxlength` validators run and show errors. */
      validateOn?: ValidateOn;
      pattern?: Validator<typeof value>;
      minlength?: Validator<typeof value>;
      maxlength?: Validator<typeof value>;
      onblur?: (event: FocusEvent) => void;
      oninput?: (event: Event) => void;
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
    name,
    label,
    helperText,
    required,
    value = $bindable(),
    ref = $bindable(null),
    type = 'text',
    validateOn = 'blur',
    pattern,
    minlength,
    maxlength,
    onblur,
    oninput,
    ...inputProps
  }: InputProps = $props();

  /** Shown validation message; updated only on configured interaction events. */
  let displayError = $state<string | undefined>(undefined);

  const hasValidators = $derived(Boolean(pattern ?? minlength ?? maxlength));

  /**
   * Runs configured validators against a value.
   * @param val - Current input value.
   * @returns First error message, or undefined when valid.
   */
  function runValidators(val: string): string | undefined {
    if (pattern) {
      const msg = pattern(val);
      if (msg) return msg;
    }
    if (minlength) {
      const msg = minlength(val);
      if (msg) return msg;
    }
    if (maxlength) {
      const msg = maxlength(val);
      if (msg) return msg;
    }
    if (required && !val) return 'Required';
    return undefined;
  }

  /**
   * Updates displayed error only when the message changes to avoid extra re-renders.
   * @param val - Current input value.
   */
  function applyValidation(val: string) {
    if (!hasValidators) return;
    const next = runValidators(val);
    if (next !== displayError) {
      displayError = next;
    }
  }

  const handleInput = (event: Event) => {
    if (validateOn === 'input' || validateOn === 'both') {
      applyValidation((event.target as HTMLInputElement).value);
    }
    oninput?.(event);
  };

  const handleBlur = (event: FocusEvent) => {
    if (validateOn === 'blur' || validateOn === 'both') {
      applyValidation((event.target as HTMLInputElement).value);
    }
    onblur?.(event);
  };
</script>

<!--
@component
A text input component with optional built-in validators.

Validation does not run until the configured interaction event fires (`validateOn`, default `blur`).
Pass `oninput` / `onblur` to hook the same events without replacing value binding.

Example:
```svelte
<Textinput
  name="email"
  bind:value={email}
  validateOn="input"
  minlength={(v) => (v.length < 3 ? 'Minimum 3 characters' : null)}
/>
```
-->
<div class="form-field">
  {#if label}
    <label for={name} class="label-large">
      {label}
      {#if required}
        <span class="label-large text-destructive">*</span>
      {/if}
    </label>
  {/if}
  <input
    {type}
    id={name}
    {name}
    class={[
      'textinput',
      'body-medium',
      'border-border-input',
      'h-input-mobile',
      'md:h-input',
      'bg-input-bg',
      'hover:shadow-mini',
      displayError ? 'border-destructive' : ''
    ]}
    bind:this={ref}
    bind:value
    oninput={handleInput}
    onblur={handleBlur}
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
