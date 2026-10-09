export const asyncFilter = async <T>(
  originalArray: Array<T>,
  predicate: (value: T) => Promise<boolean>
): Promise<Array<T>> => {
  const booleanArr = await Promise.all(originalArray.map(predicate));
  return originalArray.filter((_e, i) => booleanArr[i]);
};
