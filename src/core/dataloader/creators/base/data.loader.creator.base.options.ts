export interface DataLoaderCreatorBaseOptions<TReturn> {
  /***
   * Which fields of the returned type to select when executing the batch function.
   * Selects all fields by default
   */
  // todo make mandatory later
  fields?: Array<keyof TReturn>;
  /**
   * Default `true`. Set to `false` to disable memoization caching, creating a
   * new Promise and new key in the `batchLoadFn` for every load of the same
   * key
   */
  cache?: boolean;
}
