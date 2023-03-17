import { FindOptionsSelect } from 'typeorm';
import {
  DataLoaderCreatorLimitOptions,
  DataLoaderCreatorPaginationOptions,
} from '../creators/base';

export type FindByBatchIdsOptions<TParent, TResult> = Omit<
  DataLoaderCreatorLimitOptions<TParent, TResult> &
    DataLoaderCreatorPaginationOptions<TParent, TResult>,
  'cache' | 'parentClassRef' | 'fields'
> & {
  select: FindOptionsSelect<TParent>;
};
