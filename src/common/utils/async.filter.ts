export const asyncFilter = async <T>(
  originalArray: Array<T>,
  predicate: (value: T) => Promise<boolean>
): Promise<Array<T>> => {
  const results = await Promise.all(originalArray.map(predicate));
  return originalArray.filter((_, i) => results[i]);
};
