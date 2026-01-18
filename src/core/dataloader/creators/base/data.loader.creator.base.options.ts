import { AuthorizationPrivilege } from '@common/enums';
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
   * Overwrites the default behaviour of what to return when resolving the unresolved result for a key.
   * This is useful when the result is expected to be null, and it's not an exceptional case.
   * ---
   * The default behaviour is determined by the Loader decorator on the dataloader`s creation.
   * If the underlying graphql field, for which the dataloader is created, is nullable - the result can be resolved to null.
   * <br/>
   * Example:
   * ```
   * @ResolveField(() => ICallout, {
   *   nullable: true,
   *   description: 'The Callout that was published.',
   * })
   * public callout(
   *   @Parent() { payload }: InAppNotificationCalloutPublished,
   *   @Loader(CalloutLoaderCreator) loader: ILoader<ICallout | null>
   * ) {
   *   return loader.load(payload.calloutID);
   * }
   * ```
   * The `callout` is decorated as nullable, so the dataloader will auto-resolve to `null` if the result is not found.
   * <br/>
   * You can override this behaviour by setting the option to `false`. That way the problematic values will always be resolved to errors.
   */
  resolveToNull?: boolean;
  /***
   * If set, the dataloader will check if the requester has the specified privilege on the RESULT.
   */
  checkResultPrivilege?: AuthorizationPrivilege;
  /***
   * If set, the dataloader will check if the requester has the specified privilege on the PARENT.
   */
  checkParentPrivilege?: AuthorizationPrivilege;
}
