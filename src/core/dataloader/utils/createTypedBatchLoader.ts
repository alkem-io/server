import DataLoader from 'dataloader';
import { ILoader } from '../loader.interface';

export const createBatchLoader = <TResult>(
  name: string,
  batchLoadFn: DataLoader.BatchLoadFn<string, TResult>
): ILoader<TResult> => {
  return new DataLoader<string, TResult>(keys => batchLoadFn(keys), {
    cache: true,
    name,
  });
};
