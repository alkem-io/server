import DataLoader from 'dataloader';
import { EntityManager, FindOptionsSelect } from 'typeorm';
import { Type } from '@nestjs/common';
import { EntityNotFoundException } from '@common/exceptions';
import { DataLoaderCreatorOptions } from '../creators/base';
import { ILoader } from '../loader.interface';
import { selectOptionsFromFields } from './selectOptionsFromFields';
import { findByBatchIdsSimple } from './findByBatchIdsSimple';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';

export const createTypedSimpleDataLoader = <TResult extends { id: string }>(
  manager: EntityManager,
  classRef: Type<TResult>,
  name: string,
  options?: DataLoaderCreatorOptions<TResult, TResult>
): ILoader<TResult | null | EntityNotFoundException> => {
  const { fields, ...restOptions } = options ?? {};
  // if fields ia specified, select specific fields, otherwise select all fields
  const selectOptions = fields
    ? Array.isArray(fields)
      ? {
          id: true,
          ...selectOptionsFromFields(fields),
        }
      : fields
    : undefined;

  return new DataLoader<
    string,
    | TResult
    | null
    | EntityNotFoundException
    | ForbiddenAuthorizationPolicyException
  >(
    keys =>
      findByBatchIdsSimple(manager, classRef, keys as string[], {
        ...restOptions,
        select: selectOptions as FindOptionsSelect<TResult>,
        dataLoaderName: name,
      }),
    {
      cache: options?.cache,
      name,
    }
  );
};
