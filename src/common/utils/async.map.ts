export const asyncMap = <T, U>(
  array: T[],
  asyncMapper: (item: T) => Promise<U>
): Promise<U[]> => {
  const promises = array.map(asyncMapper);
  return Promise.all(promises);
};
