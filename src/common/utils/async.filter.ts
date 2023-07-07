export const asyncFilter = <T>(
  array: Array<T>,
  predicate: (value: T) => Promise<boolean>
): Promise<Array<T>> => {
  return new Promise(resolve => {
    const booleanArr: Array<Promise<boolean>> = [];
    array.forEach(e => booleanArr.push(predicate(e)));

    Promise.all(booleanArr).then(booleanArr => {
      const arr2 = array.filter((e, i) => booleanArr[i]);
      resolve(arr2);
    });
  });
};
