import type { WithChildren, WithoutChildren } from "bits-ui";
import type { HTMLInputAttributes } from "svelte/elements";

export type InputRootPropsWithoutHtml = WithChildren<{
  ref?: HTMLElement | null;
}>;

type InputElement = InputRootPropsWithoutHtml & WithoutChildren<HTMLInputAttributes> & {
  fluid?: boolean;
  // required?: HTMLInputAttributes['required'];
  // value?: HTMLInputAttributes['value'];
  // onChange?: HTMLInputAttributes['onChange'];
  // onInput?: HTMLInputAttributes['onInput'];
  // onBlur?: HTMLInputAttributes['onBlur'];
  // onFocus?: HTMLInputAttributes['onFocus'];
  // onKeyDown?: HTMLInputAttributes['onKeyDown'];
  // onKeyUp?: HTMLInputAttributes['onKeyUp'];
  // onKeyPress?: HTMLInputAttributes['onKeyPress'];
};

export type InputRootProps = InputElement;
