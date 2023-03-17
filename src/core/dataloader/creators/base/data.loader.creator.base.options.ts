import { Type } from '@nestjs/common';
import { FindOptionsSelect } from 'typeorm';

export interface DataLoaderCreatorBaseOptions<TParent, TResult> {
  /***
   * Specify to which parent entity would you have to join the relation
   * in order to return the result.
   * Useful in the where an entity like BaseChallenge, AuthorizableEntity, etc. are used for inheritance
   * but it's not a TypeORM entity and you can pass the appropriate entity here and
   * reduce the boilerplate
   */
  parentClassRef?: Type<TParent>;
  /***
   * Specify how to retrieve the result after the join is performed.
   * If this function is not specified,
   * the top level relation will be used to retrieve the result
   */
  getResult?: (resultAfterJoin: TParent) => TResult | undefined;
  /***
   * Which fields of the returned type to select when executing the batch function.
   * Selects all fields by default
   */
  // todo make mandatory later
  fields?: Array<keyof TResult> | FindOptionsSelect<TParent>;
  /**
   * Default `true`. Set to `false` to disable memoization caching, creating a
   * new Promise and new key in the `batchLoadFn` for every load of the same
   * key
   */
  cache?: boolean;
  /***
   * What to return when resolving the unresolved result for a key.
   * The default behaviour is to return an error - set to true to return NULL instead.
   * This is useful when an a result is expected to be null and it's not an
   * exceptional case.
   */
  resolveToNull?: boolean;
}
