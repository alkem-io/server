import { DataLoaderCreatorLimitOptions } from './data.loader.creator.limit.options';
import { DataLoaderCreatorPaginationOptions } from './data.loader.creator.pagination.options';

export type DataLoaderCreatorOptions<TResult> =
  | DataLoaderCreatorLimitOptions<TResult>
  | DataLoaderCreatorPaginationOptions<TResult>;
