import { DataLoaderCreatorLimitOptions } from './data.loader.creator.limit.options';
import { DataLoaderCreatorPaginationOptions } from './data.loader.creator.pagination.options';
import { DataLoaderCreatorSystemOptions } from './data.loader.creator.system.options';

export type DataLoaderCreatorOptions<
  TResult,
  TParent = any,
> = DataLoaderCreatorSystemOptions &
  (
    | DataLoaderCreatorLimitOptions<TParent, TResult>
    | DataLoaderCreatorPaginationOptions<TParent, TResult>
  );

export type DataLoaderCreatorInitOptions<TResult, TParent = any> =
  | DataLoaderCreatorLimitOptions<TParent, TResult>
  | DataLoaderCreatorPaginationOptions<TParent, TResult>;
