import { FindOptionsWhere, EntityManager, In } from 'typeorm';
import { Type } from '@nestjs/common';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { FindByBatchIdsOptions } from './find.by.batch.options';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';

export const findByBatchIdsSimple = async <TResult extends { id: string }>(
  manager: EntityManager,
  classRef: Type<TResult>,
  ids: string[],
  options?: FindByBatchIdsOptions<TResult, TResult>
): Promise<(TResult | null | EntityNotFoundException)[] | never> => {
  if (!ids.length) {
    return [];
  }

  const { select, limit } = options ?? {};

  const results = await manager.find(classRef, {
    take: limit,
    where: {
      id: In(ids),
    } as FindOptionsWhere<TResult>,
    select: select,
  });
  // return empty object because DataLoader does not allow to return NULL values
  // handle the value when the result is returned
  const resolveUnresolvedForKey = (key: string) => {
    return options?.resolveToNull
      ? null
      : new EntityNotFoundException(
          `Could not find ${classRef.name} for the given key`,
          LogContext.DATA_LOADER,
          { id: key }
        );
  };

  const resultsById = new Map<string, TResult>(
    results.map<[string, TResult]>(result => [result.id, result])
  );

  const resolveForKey = (
    id: string
  ): TResult | undefined | ForbiddenAuthorizationPolicyException => {
    const result = resultsById.get(id);
    if (result === undefined) {
      return undefined;
    }
    // directly return the result if no authorization is provided
    if (!options?.authorize) {
      return result;
    }
    // if the auth function is defined
    // it will return either the exception or the result
    try {
      options?.authorize(result);
    } catch (e) {
      if (e instanceof ForbiddenAuthorizationPolicyException) {
        return e;
      }

      throw e;
    }

    return result;
  };
  console.log(
    'findByBatchIdsSimple',
    classRef.name,
    options?.dataLoaderName,
    ids.length
  );
  // ensure the result length matches the input length
  return ids.map(id => resolveForKey(id) ?? resolveUnresolvedForKey(id));
};
