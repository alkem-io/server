import { generateRandomArraySelection } from './random.util';

/**
 * Accepts an array of data, limit and if must shuffle.
 * @param array Data array
 * @param limit Returns the first LIMIT results after the shuffle is applied (if applicable)
 * @param shuffle IF the array must be shuffled
 */
export const limitAndShuffle = <T>(
  array: T[],
  limit?: number,
  shuffle?: boolean
): T[] => {
  if (!array) return [];
  if (!limit) return array;

  if (limit <= 0) {
    throw new RangeError('limit must be greater than 0');
  }

  if (shuffle) {
    const randomIndexes = generateRandomArraySelection(
      Math.min(limit, array.length),
      array.length
    );
    const limitedResult: T[] = [];
    for (const index of randomIndexes) {
      limitedResult.push(array[index]);
    }
    return limitedResult;
  }
  return array.slice(0, limit);
};
