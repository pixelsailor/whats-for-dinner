/**
 * Convert a string, number, or date to milliseconds.
 * 
 * @param value - The value to convert.
 * @returns The milliseconds, or -1 if the value is invalid.
 */
export default function toMillis(value: string | number | Date): number {
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? -1 : parsed;
};
