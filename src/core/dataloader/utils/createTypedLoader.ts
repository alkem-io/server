import DataLoader from 'dataloader';
import { EntityManager } from 'typeorm';
import { Type } from '@nestjs/common';
import { EntityRelations } from '@src/types';
import { DataLoaderCreatorOptions } from '@core/dataloader/creators/base';
import { ILoader } from '../loader.interface';
import { findByBatchIds1 } from './findByBatchIds';

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
