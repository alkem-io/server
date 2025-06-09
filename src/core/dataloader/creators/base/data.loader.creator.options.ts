import { DataLoaderCreatorLimitOptions } from './data.loader.creator.limit.options';
import { DataLoaderCreatorPaginationOptions } from './data.loader.creator.pagination.options';

export type DataLoaderCreatorOptions<
  TResult,
  TParent = any,
> = DataLoaderCreatorInitOptions<TResult, TParent> &
  DataLoaderCreatorAuthOptions<TResult>;

export type DataLoaderCreatorInitOptions<TResult, TParent = any> =
  | DataLoaderCreatorLimitOptions<TParent, TResult>
  | DataLoaderCreatorPaginationOptions<TParent, TResult>;

export type DataLoaderCreatorAuthOptions<
  TResult /* extends { authorization: IAuthorizationPolicy }*/, // todo
> = {
  /**
   * Authorization function that throws or returns _true_, indicating whether results are passing the authorization check.
   * The function is defined and called only of the `checkPrivilege` option is provided to the Loader decorator.
   * Designed to be called by the batching function after the results are loaded.
   * @throws ForbiddenAuthorizationPolicyException
   * @return true if the result is authorized, otherwise throws an exception.
   */
  authorize?: (result: TResult) => true;
};
