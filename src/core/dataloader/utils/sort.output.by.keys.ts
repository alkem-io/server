import { sortBy } from 'lodash';

export const sorOutputByKeys = <T extends { id: string }>(
  output: T[],
  keys: readonly string[]
) => {
  const orderMap = keys.reduce(
    (acc, key, index) => {
      acc[key] = index;
      return acc;
    },
    {} as Record<string, number>
  );
  return sortBy(output, obj => orderMap[obj.id]);
};
