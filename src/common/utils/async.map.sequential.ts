export const asyncMapSequential = async <T, U>(
  array: T[],
  asyncMapper: (item: T) => Promise<U>
): Promise<U[]> => {
  const results: U[] = [];
  for (const item of array) {
    const result = await asyncMapper(item);
    results.push(result);
  }
  return results;
};
