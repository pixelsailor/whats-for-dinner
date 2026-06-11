import type { FormControlStateWithValue, FormControlValue } from './types';

/**
 * FormControl is a proxy for relaying form input state.
 * Used within a `Form` to convey the state of each input within the `<form>` element
 */
export default class FormControl<
  TValue extends FormControlValue = string
> implements FormControlStateWithValue<TValue> {
  value = $state() as TValue;

  invalid = $state<boolean | null>(null);

  valid = $state<boolean | null>(null);

  error = $state<string>('');

  pending = $state<boolean>(false);

  touched = $state(false);

  dirty = $state(false);

  disabled = $state(false);

  hidden = $state(false);

  readonly = $state(false);

  constructor(initialValue: TValue) {
    this.value = initialValue;
  }
}
