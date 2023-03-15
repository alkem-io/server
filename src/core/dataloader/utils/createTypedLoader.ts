import DataLoader from 'dataloader';
import {
  EntityManager,
  FindOptionsRelations,
  FindOptionsSelect,
} from 'typeorm';
import { Type } from '@nestjs/common';
import { EntityRelations } from '@src/types';
import { DataLoaderCreatorOptions } from '@core/dataloader/creators/base';
import { ILoader } from '../loader.interface';
import { findByBatchIds1, findByBatchIdsNew } from './findByBatchIds';
import { IProfile } from '@src/domain';

export const createTypedDataLoader = <
  TParent extends { id: string } & { [key: string]: any }, // todo better type,
  TResult
>(
  manager: EntityManager,
  parentClassRef: Type<TParent>,
  relation: EntityRelations<TParent>,
  name: string,
  options?: DataLoaderCreatorOptions<TResult>
): ILoader<TResult> => {
  return new DataLoader<string, TResult>(
    keys =>
      findByBatchIds1<TParent, TResult>(
        manager,
        parentClassRef,
        keys as string[],
        relation,
        options
      ),
    {
      cache: options?.cache,
      name,
    }
  );
};

export const createTypedDataLoaderNew = <
  TParent extends { id: string } & { [key: string]: any }, // todo better type,
  TResult
>(
  manager: EntityManager,
  parentClassRef: Type<TParent>,
  relations: FindOptionsRelations<TParent>,
  name: string,
  options?: DataLoaderCreatorOptions<TResult>
): ILoader<TResult> => {
  const { fields, ...restOptions } = options ?? {};

  const topRelation = <keyof TResult>Object.keys(relations)[0];

  const selectOptions = fields?.reduce<FindOptionsSelect<TResult>>(
    (acc, val) => ({
      ...acc,
      [val]: true,
    }),
    {}
  );

  return new DataLoader<string, TResult>(
    keys =>
      findByBatchIdsNew<TParent, TResult>(
        manager,
        parentClassRef,
        keys as string[],
        relations,
        {
          ...restOptions,
          fields: {
            id: true,
            [topRelation]: selectOptions,
          } as FindOptionsSelect<TParent>,
        }
      ),
    {
      cache: options?.cache,
      name,
    }
  );
};
