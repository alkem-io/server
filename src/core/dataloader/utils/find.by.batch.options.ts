import { FindOptionsSelect } from '@core/typeorm-compat.types';
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
  DataLoaderCreatorAuthOptions<any> & {
    select?: FindOptionsSelect<TParent>;
    dataLoaderName?: string; // for debugging purposes
  };
