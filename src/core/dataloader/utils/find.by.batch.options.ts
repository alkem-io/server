import { FindOptionsSelect } from 'typeorm';
import {
  DataLoaderCreatorAuthOptions,
  DataLoaderCreatorLimitOptions,
  DataLoaderCreatorPaginationOptions,
} from '../creators/base';

export type FindByBatchIdsOptions<TParent, TResult> = Omit<
  DataLoaderCreatorLimitOptions<TParent, TResult> &
    DataLoaderCreatorPaginationOptions<TParent, TResult>,
  'cache' | 'parentClassRef' | 'fields'
> &
  DataLoaderCreatorAuthOptions<TResult> & {
    select: FindOptionsSelect<TParent>;
    dataLoaderName?: string; // for debugging purposes
  };
