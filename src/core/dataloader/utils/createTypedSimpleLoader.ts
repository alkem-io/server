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
): ILoader<TResult | null> => {
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

  return new DataLoader<string, TResult | null>(
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
