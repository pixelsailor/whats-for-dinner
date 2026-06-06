/**
 * @fileoverview Holds per-field form state and runs validators keyed by DOM event names.
 * @module lib/ui/forms/form-field
 */

/**
 * A function that validates a value.
 * @param value - The value to validate.
 * @returns A string if the value is invalid, otherwise null.
 */
export type ValidationFn<T = string> = (value: T) => null | string;

/**
 * A validator name.
 */
type ValidatorName = 'onChange' | 'onBlur' | 'onInput' | 'onFocus';

/**
 * A validator for a field in the shape of `onChange: (value: T) => null | string`
 * where `string` is the error message if the value is invalid, otherwise null.
 */
// type Validators<T = string> = Record<keyof ValidatorName, ValidationFn<T>>;
interface Validators {
	onChange?: ValidationFn<string>;
	onBlur?: ValidationFn<string>;
	onInput?: ValidationFn<string>;
	onFocus?: ValidationFn<string>;
}

// type FieldValue = string | number | boolean;

export default class FormField {
	/** Current value of the field. */
	value = $state<string | null>(null);

	/** Whether the field is valid. */
	valid = $state(false);

	/** Whether the field is invalid. */
	invalid = $state(false);

	/** Errors for the field. */
	errors = $state<string[]>([]);

	/** Whether the field is pending. */
	pending = $state(false);

	/** Whether the field has been touched. */
	touched = $state(false);

	/** Whether the field has been modified. */
	dirty = $state(false);

	/** Whether the field is disabled. */
	disabled = $state(false);

	/** Whether the field is hidden. */
	hidden = $state(false);

	/** Whether the field is readonly. */
	readonly = $state(false);

	/** Name and ID of the field. */
	name = $state('');

	/** Validators for the field. */
	validators: Validators | undefined = undefined;

	/** Event handlers for the field. */
	handleBlur: (event: Event) => void = () => {};
	handleChange: (event: Event) => void = () => {};
	handleInput: (event: Event) => void = () => {};
	handleFocus: (event: Event) => void = () => {};

	constructor({
		name,
		value,
		validators
	}: {
		name: string;
		value: string;
		validators: Validators | undefined;
	}) {
		this.name = name;
		this.value = value;
		this.validators = validators;
		this._bindValidationHandlers();
	}

	private _bindValidationHandlers() {
		this.handleBlur = (event: Event) => {
			const validator = this.validators?.onBlur;
			if (!validator) return;
			this.#validateOnBlur((event.target as HTMLInputElement).value);
		};
		this.handleChange = (event: Event) => {
			const validator = this.validators?.onChange;
			if (!validator) return;
			this.#validateOnChange((event.target as HTMLInputElement).value);
		};
		this.handleInput = (event: Event) => {
			const validator = this.validators?.onInput;
			if (!validator) return;
			this.#validateOnInput((event.target as HTMLInputElement).value);
		};
		this.handleFocus = (event: Event) => {
			const validator = this.validators?.onFocus;
			if (!validator) return;
			this.#validateOnFocus((event.target as HTMLInputElement).value);
		};
	}

	#setFieldState(value: string, error: string | null) {
		const nextValid = error === null && this.dirty;
		const nextInvalid = error !== null && this.dirty;
		const nextErrors = error !== null ? [error] : [];
		const currentError = this.errors[0];

		if (
			this.value === value &&
			this.valid === nextValid &&
			this.invalid === nextInvalid &&
			currentError === error &&
			this.pending === false
		) {
			return;
		}

		this.value = value;
		this.valid = nextValid;
		this.invalid = nextInvalid;
		this.errors = nextErrors;
		this.pending = false;
	}

	#validateOnBlur(value: string) {
		const error = this.validators?.onBlur?.(value);
		this.#setFieldState(value, error ?? null);
	}

	#validateOnChange(value: string) {
		const error = this.validators?.onChange?.(value);
		this.#setFieldState(value, error ?? null);
	}

	#validateOnInput(value: string) {
		const error = this.validators?.onInput?.(value);
		this.#setFieldState(value, error ?? null);
	}

	#validateOnFocus(value: string) {
		const error = this.validators?.onFocus?.(value);
		this.#setFieldState(value, error ?? null);
	}
}
