import { DataLoaderCreatorBaseOptions } from './data.loader.creator.base.options';

export interface DataLoaderCreatorLimitOptions<TParent, TResult>
  extends DataLoaderCreatorBaseOptions<TParent, TResult> {
  /***
   * How many records to retrieve.
   * Retrieves all records by default
   */
  limit?: number;
  /***
   * Should the returned records by shuffled (randomized).
   * False by default
   */
  shuffle?: boolean;
}
