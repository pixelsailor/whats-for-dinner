/**
 * @fileoverview Holds per-field form state and runs validators keyed by DOM event names.
 * @module lib/ui/forms/form-field
 */

// Old validation types -- may be reimplemented later for additional field value types.
// type ValidatorName = 'onChange' | 'onBlur' | 'onInput' | 'onFocus' | 'required';
// type Validators<T = string> = Record<keyof ValidatorName, ValidationFn<T>>;
// type FieldValue = string | number | boolean;

/**
 * A function that validates a value.
 * @param value - The value to validate.
 * @returns A string if the value is invalid, otherwise null.
 */
export type ValidationFn<T = string> = (value: T) => null | string;


/**
 * A validator for a field in the shape of `onChange: (value: T) => null | string`
 * where `string` is the error message if the value is invalid, otherwise null.
 * Validation using `required` is given special handling to ensure it is always validated on blur.
 * `required` will show it's value as the error message if the field is empty.
 */
interface Validators {
	onChange?: ValidationFn<string>;
	onBlur?: ValidationFn<string>;
	onInput?: ValidationFn<string>;
	onFocus?: ValidationFn<string>;
	required?: string;
}

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

	/** Whether the field is required. */
	required = $state(false);

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
		if (this.validators?.required) {
			this.required = true;
		}

		this.handleBlur = (event: Event) => {
			/** Always validate required field on blur. */
			const value = (event.target as HTMLInputElement).value;
			if (this.required) {
				this.#validateRequired(value);
			}
			const validator = this.validators?.onBlur;
			if (!validator) return;
			this.#validateOnBlur(value);
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

	#validateRequired(value: string) {
		const error = value.length === 0 ? this.validators?.required : null;
		this.#setFieldState(value, error ?? null);
	}
}
