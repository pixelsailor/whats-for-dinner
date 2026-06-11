import type { WithElementRef } from 'bits-ui';
import type { HTMLInputAttributes } from 'svelte/elements';

export type FormControlValue = string | number | boolean;

export interface FormControlState {
  invalid: boolean | null;
  valid: boolean | null;
  error: string;
  pending: boolean;
  touched: boolean;
  dirty: boolean;
  disabled: boolean;
  hidden: boolean;
  readonly: boolean;
}

export interface FormControlStateWithValue<
  TValue extends FormControlValue = string
> extends FormControlState {
  value: TValue;
}

// export interface FormControlWithName<TValue extends FormControlValue = string> extends FormControlStateWithValue<TValue> {
//   name: string;
// }

export type InputFieldProps = WithElementRef<HTMLInputAttributes> & {
  helperText?: string;
  labelText: string;
  labelRef?: HTMLLabelElement | null;
  requiredText?: string;
  validateOn?: 'input' | 'change';
  minLength?: (value: string) => string | null;
  maxLength?: (value: string) => string | null;
  pattern?: (value: string) => string | null;
  onblur?: (event: FocusEvent) => void;
  onchange?: (event: Event) => void;
  onfocus?: (event: FocusEvent) => void;
  oninput?: (event: Event) => void;
} & Omit<HTMLInputAttributes, 'value'>;
