import { Type } from '@nestjs/common';

export interface DataLoaderCreatorBaseOptions<TReturn, TParent = unknown> {
  /***
   * Specify to which parent entity would you have to join the relation
   * in order to return the result.
   * Useful in the where an entity like BaseChallenge is used for inheritance
   * but it's not a TypeORM entity and you can pass the appropriate entity here and
   * reduce the boilerplate
   */
  parentClassRef?: Type<TParent>;
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
