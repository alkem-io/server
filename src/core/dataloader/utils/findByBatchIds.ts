import {
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  EntityManager,
  In,
} from 'typeorm';
import { Type } from '@nestjs/common';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import {
  DataLoaderCreatorLimitOptions,
  DataLoaderCreatorPaginationOptions,
} from '../creators/base';

export type FindByBatchIdsOptionsNew<TParent, TResult> = Omit<
  DataLoaderCreatorLimitOptions<TParent, TResult> &
    DataLoaderCreatorPaginationOptions<TParent, TResult>,
  'cache' | 'parentClassRef' | 'fields'
> & {
  select: FindOptionsSelect<TParent>;
};

export const findByBatchIds = async <
  TParent extends { id: string } & { [key: string]: any }, // todo better type
  TResult
>(
  manager: EntityManager,
  classRef: Type<TParent>,
  ids: string[],
  relations: FindOptionsRelations<TParent>,
  options?: FindByBatchIdsOptionsNew<TParent, TResult>
): Promise<(TResult | Error)[] | never> => {
  if (!ids.length) {
    return [];
  }

  const relationKeys = Object.keys(relations);

  if (relationKeys.length > 1) {
    throw new Error(
      `'relations' support only one top level relation, '${relationKeys}' found instead`
    );
  }

  const { select, limit } = options ?? {};

  const results = await manager.find<TParent>(classRef, {
    take: limit,
    where: {
      id: In(ids),
    } as FindOptionsWhere<TParent>,
    relations: relations,
    select: select,
  });

  const topLevelRelation = relationKeys[0];

  const getRelation = (result: TParent) =>
    options?.getResult?.(result) ?? result[topLevelRelation];

  const resultsById = new Map<string, TResult>(
    results.map<[string, TResult]>(result => [result.id, getRelation(result)])
  );
  // ensure the result length matches the input length
  return ids.map(
    id =>
      resultsById.get(id) ??
      new EntityNotFoundException(
        `Could not load relation '${topLevelRelation}' for '${id}'`,
        LogContext.DATA_LOADER
      )
  );
};
