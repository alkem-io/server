import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  ForbiddenAuthorizationPolicyException,
} from '@common/exceptions';
import { NotImplementedException, Type } from '@nestjs/common';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { inArray } from 'drizzle-orm';
import { FindByBatchIdsOptions } from './find.by.batch.options';

export const findByBatchIdsSimple = async <TResult extends { id: string }>(
  db: DrizzleDb,
  tableName: string,
  ids: string[],
  options: FindByBatchIdsOptions<TResult, TResult>
): Promise<
  (
    | TResult
    | null
    | EntityNotFoundException
    | ForbiddenAuthorizationPolicyException
  )[]
> => {
  if (options.checkParentPrivilege) {
    throw new NotImplementedException(
      'Checking parent privilege is not supported for simple batch loading'
    );
  }

  if (!ids.length) {
    return [];
  }

  const { limit } = options ?? {};

  // Get the table from the schema
  const table = (db.query as any)[tableName];
  if (!table) {
    throw new Error(`Table ${tableName} not found in Drizzle schema`);
  }

  const results = await table.findMany({
    where: (t: any) => inArray(t.id, ids),
    limit: limit,
  }) as TResult[];
  // return empty object because DataLoader does not allow to return NULL values
  // handle the value when the result is returned
  const resolveUnresolvedForKey = (key: string) => {
    return options?.resolveToNull
      ? null
      : new EntityNotFoundException(
          `Could not find ${tableName} for the given key`,
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
