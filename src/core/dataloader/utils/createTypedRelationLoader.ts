import DataLoader from 'dataloader';
import {
  EntityManager,
  FindOptionsRelations,
  FindOptionsSelect,
} from 'typeorm';
import { Type } from '@nestjs/common';
import { DataLoaderCreatorOptions } from '../creators/base';
import { ILoader } from '../loader.interface';
import { findByBatchIds } from './findByBatchIds';
import { selectOptionsFromFields } from './selectOptionsFromFields';

export const createTypedRelationDataLoader = <
  TParent extends { id: string } & { [key: string]: any }, // todo better type,
  TResult
>(
  manager: EntityManager,
  parentClassRef: Type<TParent>,
  relations: FindOptionsRelations<TParent>,
  name: string,
  options?: DataLoaderCreatorOptions<TResult, TParent>
): ILoader<TResult> => {
  const { fields, ...restOptions } = options ?? {};

  const topRelation = <keyof TResult>Object.keys(relations)[0];

  const selectOptions = fields
    ? Array.isArray(fields)
      ? {
          id: true,
          [topRelation]: selectOptionsFromFields(fields),
        }
      : fields
    : { id: true };

  return new DataLoader<string, TResult>(
    keys =>
      findByBatchIds<TParent, TResult>(
        manager,
        parentClassRef,
        keys as string[],
        relations,
        {
          ...restOptions,
          select: selectOptions as FindOptionsSelect<TParent>,
        }
      ),
    {
      cache: options?.cache,
      name,
    }
  );
};
