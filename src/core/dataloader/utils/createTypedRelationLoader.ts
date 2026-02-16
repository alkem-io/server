import { EntityNotFoundException } from '@common/exceptions';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import DataLoader from 'dataloader';
import { DataLoaderCreatorOptions } from '../creators/base';
import { ILoader } from '../loader.interface';
import { findByBatchIds } from './findByBatchIds';

export const createTypedRelationDataLoader = <
  TParent extends { id: string } & { [key: string]: any }, // todo better type,
  TResult,
>(
  db: DrizzleDb,
  tableName: string,
  relations: Record<string, boolean | object>,
  name: string,
  options: DataLoaderCreatorOptions<TResult, TParent>
): ILoader<
  | TResult
  | null
  | EntityNotFoundException
  | ForbiddenAuthorizationPolicyException
> => {
  const { fields, ...restOptions } = options ?? {};

  return new DataLoader<
    string,
    | TResult
    | null
    | EntityNotFoundException
    | ForbiddenAuthorizationPolicyException
  >(
    keys =>
      findByBatchIds<
        TParent,
        | TResult
        | null
        | EntityNotFoundException
        | ForbiddenAuthorizationPolicyException
      >(db, tableName, keys as string[], relations, {
        ...restOptions,
        dataLoaderName: name,
      }),
    {
      cache: options?.cache,
      name,
    }
  );
};
