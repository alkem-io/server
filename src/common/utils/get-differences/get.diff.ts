/**
 * Compares the first object to the second and returns the differences.
 * Comparison is done against the keys in obj1.
 * Return __null__ if no differences are found.
 *
 * @template T - The type of the objects being compared.
 * @param {T} obj1 - The first object to compare.
 * @param {T} obj2 - The second object to compare.
 * @returns {Partial<T> | null} - A partial object containing the differences, or null if no differences are found.
 */
export const getDiff = <T extends Record<string, any>>(
  obj1: T,
  obj2: T
): Partial<T> | null => {
  const result: Partial<T> = {};

  for (const key in obj1) {
    if (Object.hasOwn(obj1, key) && Object.hasOwn(obj2, key)) {
      const value1 = obj1[key];
      const value2 = obj2[key];

      if (
        typeof value1 === 'object' &&
        typeof value2 === 'object' &&
        value1 !== null &&
        value2 !== null
      ) {
        const nestedDiff = getDiff(value1, value2);
        if (nestedDiff !== null) {
          result[key] = nestedDiff as T[Extract<keyof T, string>];
        }
      } else if (value1 !== value2) {
        result[key] = value2;
      }
    }
  }

  return Object.keys(result).length ? result : null;
};
