/**
 * Generic type guard to filter out undefined or null.
 * Useful when filtering array of undefined values.
 * To be deprecated when Typescript 5.5 is introduced with improved type checking when filtering.
 * @param value
 */
export const isDefined = <T>(value: T | undefined | null): value is T => {
  return value != undefined;
};
