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
import { AuthorizationPolicy } from '@domain/common/authorization-policy';

export const findByBatchIds = async <
  TParent extends { id: string } & {
    [key: string]: any;
  }, // todo better type
  TResult,
>(
  manager: EntityManager,
  classRef: Type<TParent>,
  ids: string[],
  relations: FindOptionsRelations<TParent>,
  options: FindByBatchIdsOptions<TParent, TResult>
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

  const resultsById = new Map<string, TParent>(
    sortedResults.map<[string, TParent]>(parent => [parent.id, parent])
  );

  const resolveForKeyAndMaybeAuthorize = (
    id: string
  ): TResult | undefined | ForbiddenAuthorizationPolicyException => {
    const parent = resultsById.get(id);
    if (parent === undefined) {
      return undefined;
    }
    // check the parent if flag is present
    if (options.checkParentPrivilege) {
      try {
        options.authorize(parent, options.checkParentPrivilege);
      } catch (e) {
        if (e instanceof ForbiddenAuthorizationPolicyException) {
          return e;
        }
      }
    }
    // check the result if flag is present
    if (options.checkResultPrivilege) {
      try {
        options.authorize(parent, options.checkResultPrivilege);
      } catch (e) {
        if (e instanceof ForbiddenAuthorizationPolicyException) {
          return e;
        }
      }
    }
    return getRelation(parent);
  };
  console.log(
    'findByBatchIds',
    classRef.name,
    options?.dataLoaderName,
    ids.length
  );

  // ensure the result length matches the input length; fill the missing values with unresolved values
  return ids.map(
    id => resolveForKeyAndMaybeAuthorize(id) ?? resolveUnresolvedForKey(id)
  );
};
