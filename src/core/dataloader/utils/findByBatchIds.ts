import {
  FindOptionsRelations,
  FindOptionsWhere,
  EntityManager,
  In,
} from 'typeorm';
import { Type } from '@nestjs/common';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { FindByBatchIdsOptions } from '../utils';

export const findByBatchIds = async <
  TParent extends { id: string } & { [key: string]: any }, // todo better type
  TResult
>(
  manager: EntityManager,
  classRef: Type<TParent>,
  ids: string[],
  relations: FindOptionsRelations<TParent>,
  options?: FindByBatchIdsOptions<TParent, TResult>
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
  // return empty object because DataLoader does not allow to return NULL values
  // handle the value when the result is returned
  const resolveUnresolvedForKey = options?.resolveToNull
    ? () => ({} as TResult)
    : (key: string) =>
        new EntityNotFoundException(
          `Could not load relation '${topLevelRelation}' for '${key}'`,
          LogContext.DATA_LOADER
        );

  const resultsById = new Map<string, TResult>(
    results.map<[string, TResult]>(result => [result.id, getRelation(result)])
  );
  // ensure the result length matches the input length
  const a = ids.map(id => resultsById.get(id) ?? resolveUnresolvedForKey(id));
  return a;
};
