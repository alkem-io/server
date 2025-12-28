import { DataLoaderCreatorLimitOptions } from '@core/dataloader/creators';
import { DataLoaderCreatorPaginationOptions } from '@core/dataloader/creators';
import { AuthorizationPrivilege } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';

export type DataLoaderCreatorOptions<
  TResult,
  TParent = any,
> = DataLoaderCreatorInitOptions<TResult, TParent> &
  DataLoaderCreatorAuthOptions<any>;

export type DataLoaderCreatorInitOptions<TResult, TParent = any> =
  | DataLoaderCreatorLimitOptions<TParent, TResult>
  | DataLoaderCreatorPaginationOptions<TParent, TResult>;

export type DataLoaderCreatorAuthOptions<
  TEntity extends { authorization?: IAuthorizationPolicy },
> = {
  /**
   * Authorization function that throws or returns _true_, indicating whether results are passing the authorization check.
   * The function is defined and called only of the `checkPrivilege` option is provided to the Loader decorator.
   * Designed to be called by the batching function after the results are loaded.
   * @throws ForbiddenAuthorizationPolicyException
   * @return true if the result is authorized, otherwise throws an exception.
   */
  authorize: (result: TEntity, privilege: AuthorizationPrivilege) => boolean;
};
