/**
 * Generate secure random bytes.
 *
 * @param size - The size of the random bytes to generate.
 * @returns The random bytes.
 *
 * @example
 * ```typescript
 * const randomBytes = randomBytes(8);
 * console.log(randomBytes);
 * ```
 */

export type RandomBytesCallback = (err: Error | null, buf?: Uint8Array) => void;

const scheduleCallback =
  typeof queueMicrotask === 'function'
    ? queueMicrotask
    : (fn: () => void) => setTimeout(fn, 0);

const hasSecureRandom =
  typeof globalThis.crypto !== 'undefined' &&
  typeof globalThis.crypto.getRandomValues === 'function';

const validateSize = (size: number): void => {
  if (!Number.isInteger(size) || size < 0) {
    throw new RangeError('size must be a non-negative integer');
  }
};

const generateRandomBytes = (size: number): Uint8Array => {
  validateSize(size);

  if (!hasSecureRandom) {
    throw new Error(
      'Secure random number generation is not supported in this environment.'
    );
  }

  const buffer = new Uint8Array(size);
  globalThis.crypto.getRandomValues(buffer);
  return buffer;
};

export default function randomBytes(size: number): Uint8Array;
export default function randomBytes(
  size: number,
  callback: RandomBytesCallback
): void;
export default function randomBytes(
  size: number,
  callback?: RandomBytesCallback
): Uint8Array | void {
  if (typeof callback === 'function') {
    try {
      const buffer = generateRandomBytes(size);
      scheduleCallback(() => callback(null, buffer));
    } catch (error) {
      scheduleCallback(() => callback(error as Error));
    }
    return;
  }

  return generateRandomBytes(size);
}
