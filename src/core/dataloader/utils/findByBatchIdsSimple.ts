import { FindOptionsWhere, EntityManager, In } from 'typeorm';
import { NotImplementedException, Type } from '@nestjs/common';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { FindByBatchIdsOptions } from './find.by.batch.options';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';

export const findByBatchIdsSimple = async <TResult extends { id: string }>(
  manager: EntityManager,
  classRef: Type<TResult>,
  ids: string[],
  options: FindByBatchIdsOptions<TResult, TResult>
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

  const resolveForKeyAndMaybeAuthorize = (
    id: string
  ): TResult | undefined | ForbiddenAuthorizationPolicyException => {
    const result = resultsById.get(id);
    if (result === undefined) {
      return undefined;
    }

    if (options.checkParentPrivilege) {
      throw new NotImplementedException(
        'Checking parent privilege is not implemented yet for simple batch loading'
      );
    }

    // check the result if flag is present
    if (options.checkResultPrivilege) {
      try {
        options.authorize(result, options.checkResultPrivilege);
      } catch (e) {
        if (e instanceof ForbiddenAuthorizationPolicyException) {
          return e;
        }
      }
    }

    return result;
  };
  // ensure the result length matches the input length
  return ids.map(
    id => resolveForKeyAndMaybeAuthorize(id) ?? resolveUnresolvedForKey(id)
  );
};
