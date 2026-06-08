import type { WithChild } from "bits-ui";
import type { HTMLFormAttributes } from "svelte/elements";

// export type FormRootPropsWithoutHTML = WithChild<{
//   value?: string;

//   // onValueChange?: (value: string) => void;
//   onValueChange?: (event: Event) => void;

//   disabled?: boolean;
// }>;

export type FormControlValue = string | number | boolean;

export interface FormControlState<T = string> {
  value: T | null;
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

export interface FormControl<T = string> {
  state: FormControlState<T>;
}

export interface FormControlWithName<T = string> extends FormControl<T> {
  name: string;
}