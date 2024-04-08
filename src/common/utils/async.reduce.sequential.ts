export const asyncReduceSequential = async <T, U>(
  array: T[],
  asyncReducer: (accumulator: U, current: T, index: number) => Promise<U>,
  initialValue: U
): Promise<U> => {
  let accumulator = initialValue;
  for (let i = 0; i < array.length; i++) {
    const current = array[i];
    accumulator = await asyncReducer(accumulator, current, i);
  }
  return accumulator;
};
