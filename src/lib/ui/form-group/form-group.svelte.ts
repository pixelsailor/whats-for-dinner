/**
 * Maintains reactive form state and validation.
 * @module lib/ui/forms/form.svelte
 */

import FormControl from './form-control.svelte';
import type { FormControlValue } from './types';

type ControlMap<T extends Record<string, FormControlValue>> = {
  [K in keyof T]: FormControl<T[K]>;
};

/**
 * FormGroup is a collection of FormControls for binding form fields to the parent `FormGroup` instance.
 *
 * @example
 * const formGroup = new FormGroup({
 *   email: '',
 *   password: '',
 * })
 */
export default class FormGroup<T extends Record<string, FormControlValue>> {
  state = $state({
    invalid: null,
    valid: null,
    errors: [],
    touched: false,
    dirty: false,
    disabled: false,
    hidden: false,
    readonly: false
  });

  controls = $state({}) as ControlMap<T>;

  constructor(initialValues: T) {
    for (const key of Object.keys(initialValues) as (keyof T)[]) {
      this.controls[key] = new FormControl(initialValues[key]);
    }
  }
}
