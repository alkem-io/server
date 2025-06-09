import {
  FindOptionsRelations,
  FindOptionsWhere,
  EntityManager,
  In,
} from 'typeorm';
import { Type } from '@nestjs/common';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { FindByBatchIdsOptions } from './find.by.batch.options';
import { sorOutputByKeys } from './sort.output.by.keys';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';

export const findByBatchIds = async <
  TParent extends { id: string } & { [key: string]: any }, // todo better type
  TResult,
>(
  manager: EntityManager,
  classRef: Type<TParent>,
  ids: string[],
  relations: FindOptionsRelations<TParent>,
  options?: FindByBatchIdsOptions<TParent, TResult>
): Promise<
  (
    | TResult
    | null
    | EntityNotFoundException
    | ForbiddenAuthorizationPolicyException
  )[]
> => {
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

  const unsortedResults = await manager.find<TParent>(classRef, {
    take: limit,
    where: {
      id: In(ids),
    } as FindOptionsWhere<TParent>,
    relations: relations,
    select: select,
  });
  // todo: check if sorting is needed; hint - results are converted to Map
  const sortedResults = sorOutputByKeys(unsortedResults, ids);

  const topLevelRelation = relationKeys[0];

  const getRelation = (result: TParent) =>
    options?.getResult?.(result) ?? result[topLevelRelation];
  // return empty object because DataLoader does not allow to return NULL values
  // handle the value when the result is returned
  const resolveUnresolvedForKey = (key: string) => {
    return options?.resolveToNull
      ? null
      : new EntityNotFoundException(
          `Could not load relation '${topLevelRelation}' for ${classRef.name} for the given key: ${key}`,
          LogContext.DATA_LOADER,
          { id: key }
        );
  };

  const resultsById = new Map<string, TResult>(
    sortedResults.map<[string, TResult]>(result => [
      result.id,
      getRelation(result),
    ])
  );

  const resolveForKey = (
    id: string
  ): TResult | undefined | ForbiddenAuthorizationPolicyException => {
    const result = resultsById.get(id);
    if (result === undefined) {
      return undefined;
    }
    // if the auth function is defined
    // it will return either the exception or the result
    if (options?.authorize) {
      try {
        options?.authorize(result);
      } catch (e) {
        if (e instanceof ForbiddenAuthorizationPolicyException) {
          return e;
        }

        throw e;
      }
    }
    // directly return the result if no authorization is provided
    return result;
  };
  console.log('findByBatchIds', classRef.name, ids.length);

  // ensure the result length matches the input length; fill the missing values with unresolved values
  return ids.map(id => resolveForKey(id) ?? resolveUnresolvedForKey(id));
};
