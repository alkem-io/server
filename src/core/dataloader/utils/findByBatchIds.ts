import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  ForbiddenAuthorizationPolicyException,
} from '@common/exceptions';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { inArray } from 'drizzle-orm';
import { FindByBatchIdsOptions } from './find.by.batch.options';

export const findByBatchIds = async <
  TParent extends { id: string } & { [key: string]: any }, // todo better type
  TResult,
>(
  db: DrizzleDb,
  tableName: string,
  ids: string[],
  relations: Record<string, boolean | object>,
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

  const { limit } = options ?? {};

  // Get the table from the schema
  const table = (db.query as any)[tableName];
  if (!table) {
    throw new Error(`Table ${tableName} not found in Drizzle schema`);
  }

  const unsortedResults = await table.findMany({
    where: (t: any) => inArray(t.id, ids),
    with: relations,
    limit: limit,
  }) as TParent[];
  const topLevelRelation = relationKeys[0];

  const getRelation = (result: TParent) =>
    options?.getResult?.(result) ?? result[topLevelRelation];
  // return empty object because DataLoader does not allow to return NULL values
  // handle the value when the result is returned
  const resolveUnresolvedForKey = (key: string) => {
    return options?.resolveToNull
      ? null
      : new EntityNotFoundException(
          `Could not load relation '${topLevelRelation}' for ${tableName} for the given key: ${key}`,
          LogContext.DATA_LOADER,
          { id: key }
        );
  };

  const resultsById = new Map<string, TParent>(
    unsortedResults.map<[string, TParent]>(parent => [parent.id, parent])
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

    const result = getRelation(parent);

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

  // ensure the result length matches the input length; fill the missing values with unresolved values
  return ids.map(
    id => resolveForKeyAndMaybeAuthorize(id) ?? resolveUnresolvedForKey(id)
  );
};
