export const asyncFilter = <T>(
  originalArray: Array<T>,
  predicate: (value: T) => Promise<boolean>
): Promise<Array<T>> => {
  return new Promise(resolve => {
    const booleanArr: Array<Promise<boolean>> = [];
    originalArray.forEach(e => booleanArr.push(predicate(e)));

    Promise.all(booleanArr).then(booleanArr => {
      const filteredArray = originalArray.filter((e, i) => booleanArr[i]);
      resolve(filteredArray);
    });
  });
};
