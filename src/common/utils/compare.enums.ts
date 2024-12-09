/**
 * Compares two TypeScript enums for equality
 * @param enum1 First enum to compare
 * @param enum2 Second enum to compare
 * @returns boolean indicating if enums are equal
 */
export const compareEnums = <T extends { [key: string]: string | number }>(
  enum1: T,
  enum2: T
): boolean => {
  const keys1 = Object.keys(enum1);
  const keys2 = Object.keys(enum2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (enum1[key] !== enum2[key]) {
      return false;
    }
  }

  return true;
};
