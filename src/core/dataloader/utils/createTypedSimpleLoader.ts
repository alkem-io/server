import { EntityNotFoundException } from '@common/exceptions';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import DataLoader from 'dataloader';
import { DataLoaderCreatorOptions } from '../creators/base';
import { ILoader } from '../loader.interface';
import { findByBatchIdsSimple } from './findByBatchIdsSimple';

export const createTypedSimpleDataLoader = <TResult extends { id: string }>(
  db: DrizzleDb,
  tableName: string,
  name: string,
  options: DataLoaderCreatorOptions<TResult, TResult>
): ILoader<TResult | null | EntityNotFoundException> => {
  const { fields, ...restOptions } = options;

  return new DataLoader<
    string,
    | TResult
    | null
    | EntityNotFoundException
    | ForbiddenAuthorizationPolicyException
  >(
    keys =>
      findByBatchIdsSimple(db, tableName, keys as string[], {
        ...restOptions,
        dataLoaderName: name,
      }),
    {
      cache: options?.cache,
      name,
    }
  );
};
