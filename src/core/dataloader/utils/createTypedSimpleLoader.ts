import DataLoader from 'dataloader';
import { EntityManager, FindOptionsSelect } from 'typeorm';
import { Type } from '@nestjs/common';
import { DataLoaderCreatorOptions } from '../creators/base';
import { ILoader } from '../loader.interface';
import { selectOptionsFromFields } from './selectOptionsFromFields';
import { findByBatchIdsSimple } from './findByBatchIdsSimple';

export const createTypedSimpleDataLoader = <TResult extends { id: string }>(
  manager: EntityManager,
  classRef: Type<TResult>,
  name: string,
  options?: DataLoaderCreatorOptions<TResult, TResult>
): ILoader<TResult> => {
  const { fields, ...restOptions } = options ?? {};

  const selectOptions = fields
    ? Array.isArray(fields)
      ? {
          id: true,
          ...selectOptionsFromFields(fields),
        }
      : fields
    : { id: true };

  return new DataLoader<string, TResult>(
    keys =>
      findByBatchIdsSimple(manager, classRef, keys as string[], {
        ...restOptions,
        select: selectOptions as FindOptionsSelect<TResult>,
      }),
    {
      cache: options?.cache,
      name,
    }
  );
};
