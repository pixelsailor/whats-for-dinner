const debouncer = <A extends readonly unknown[], R>(
  fn: (...args: A) => R,
  delay: number,
) => {
  let timeoutId = $state<number>();

  return (...args: A): void => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout((): void => {
      void fn(...args);
    }, delay);
  }
}
export default debouncer;