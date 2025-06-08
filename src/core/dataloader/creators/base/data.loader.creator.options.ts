import { DataLoaderCreatorLimitOptions } from './data.loader.creator.limit.options';
import { DataLoaderCreatorPaginationOptions } from './data.loader.creator.pagination.options';

export type DataLoaderCreatorOptions<
  TResult,
  TParent = any,
> = DataLoaderCreatorAuthOptions<TResult> &
  (
    | DataLoaderCreatorLimitOptions<TParent, TResult>
    | DataLoaderCreatorPaginationOptions<TParent, TResult>
  );

export type DataLoaderCreatorInitOptions<
  TResult,
  TParent = any,
> = DataLoaderCreatorOptions<TResult, TParent>;

export type DataLoaderCreatorAuthOptions<
  TResult /* extends { authorization: IAuthorizationPolicy }*/,
> = {
  /**
   * Authorization function that throws or return true, indicating whether results are passing the authorization check.
   * @throws ForbiddenAuthorizationPolicyException
   * @return true if the result is authorized, otherwise throws an exception.
   */
  authorize?: (result: TResult) => true;
};
