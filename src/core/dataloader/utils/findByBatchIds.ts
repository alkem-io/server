import {
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  In,
  Repository,
} from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { EntityRelations } from '@src/types';

const parentAlias = 'parent';
const resultAlias = 'relation';

export const findByBatchIds = async <
  TParent extends { id: string } & { [key: string]: any }, // todo better type
  TResult
>(
  repo: Repository<TParent>,
  ids: string[],
  relations: EntityRelations<TParent> | string[],
  options?: {
    // todo make it use DataLoaderCreatorOptions
    fields?: (keyof TResult)[];
    limit?: number;
    shuffle?: boolean;
  }
): Promise<(TResult | Error)[] | never> => {
  if (!ids.length) {
    return [];
  }

  const relation = Array.isArray(relations) ? relations[0] : relations;

  const { fields, limit } = options ?? {};
  // todo make alias based on TResult name
  const qb = repo.createQueryBuilder(parentAlias).whereInIds(ids);

  if (Array.isArray(relations)) {
    relations.forEach(relation =>
      qb.leftJoin(`${parentAlias}.${relation}`, resultAlias)
    );
  }

  if (fields && fields.length) {
    qb.leftJoin(`${parentAlias}.${relation}`, resultAlias)
      .select(fields.map(field => `${resultAlias}.${field}`))
      // at least one field from TParent needs to be selected
      .addSelect(`${parentAlias}.id`, `${parentAlias}_id`);
  } else {
    // FULL select on BOTH parent and relation (result)
    // unable to select just the relation fields without the parents
    qb.leftJoinAndSelect(`${parentAlias}.${relation}`, resultAlias);
  }
  qb.take(limit);

  const results = await qb.getMany();

  const resultsById = new Map<string, TResult>(
    results.map<[string, TResult]>(x => [x.id, x[relation]])
  );
  // ensure the result length matches the input length
  return ids.map(
    id =>
      resultsById.get(id) ??
      new EntityNotFoundException(
        `Could not load relation '${relations}' for '${id}'`,
        LogContext.DATA_LOADER
      )
  );
};

export const findByBatchIdsNew = async <
  TParent extends { id: string } & { [key: string]: any }, // todo better type
  TResult
>(
  repo: Repository<TParent>,
  ids: string[],
  relations: FindOptionsRelations<TParent>,
  options?: {
    // todo make it use DataLoaderCreatorOptions
    fields?: FindOptionsSelect<TParent>;
    limit?: number;
    shuffle?: boolean;
  }
): Promise<(TResult | Error)[] | never> => {
  if (!ids.length) {
    return [];
  }

  const relationKeys = Object.keys(relations);

  if (relationKeys.length > 1) {
    throw new Error(
      `'relations' support only on top level relation, '${relationKeys}' found instead`
    );
  }

  const { fields, limit } = options ?? {};

  const results = await repo.find({
    take: limit,
    where: {
      id: In(ids),
    } as FindOptionsWhere<TParent>,
    relations: relations,
    select: fields,
    // relationLoadStrategy
  });

  const [topLevelRelation] = relationKeys;

  const resultsById = new Map<string, TResult>(
    results.map<[string, TResult]>(x => [x.id, x[topLevelRelation]])
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
