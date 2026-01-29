import { EntityNotFoundException } from '@common/exceptions';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { Type } from '@nestjs/common';
import DataLoader from 'dataloader';
import { EntityManager, FindOptionsSelect } from 'typeorm';
import { DataLoaderCreatorOptions } from '../creators/base';
import { ILoader } from '../loader.interface';
import { findByBatchIdsSimple } from './findByBatchIdsSimple';
import { selectOptionsFromFields } from './selectOptionsFromFields';

export const createTypedSimpleDataLoader = <TResult extends { id: string }>(
  manager: EntityManager,
  classRef: Type<TResult>,
  name: string,
  options: DataLoaderCreatorOptions<TResult, TResult>
): ILoader<TResult | null | EntityNotFoundException> => {
  const { fields, ...restOptions } = options;
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
