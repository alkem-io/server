import {
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  EntityManager,
  EntityTarget,
  In,
  Repository,
} from 'typeorm';
import { Type } from '@nestjs/common';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { EntityRelations } from '@src/types';

const parentAlias = 'parent';
const resultAlias = 'relation';

type FindByBatchIdsDatasource<T> =
  | Repository<T>
  | {
      manager: EntityManager;
      classRef: EntityTarget<T>;
    };

type FindByBatchIdsOptions<TResult> = {
  // todo make it use DataLoaderCreatorOptions
  fields?: (keyof TResult)[];
  limit?: number;
  shuffle?: boolean;
};

export const findByBatchIds = async <
  TParent extends { id: string } & { [key: string]: any }, // todo better type
  TResult
>(
  datasource: FindByBatchIdsDatasource<TParent>,
  ids: string[],
  relation: EntityRelations<TParent>,
  options?: FindByBatchIdsOptions<TResult>
): Promise<(TResult | Error)[] | never> => {
  if (!ids.length) {
    return [];
  }

  const { fields, limit } = options ?? {};
  const qb = (
    'classRef' in datasource
      ? datasource.manager.createQueryBuilder<TParent>(
          datasource.classRef,
          parentAlias
        )
      : (datasource as Repository<TParent>).createQueryBuilder(parentAlias)
  ).whereInIds(ids);

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
      new Error(`Could not load relation '${relation}' for '${id}'`)
  );
};

export const findByBatchIds1 = async <
  TParent extends { id: string } & { [key: string]: any }, // todo better type
  TResult
>(
  manager: EntityManager,
  classRef: Type<TParent>,
  ids: string[],
  relation: EntityRelations<TParent>,
  options?: FindByBatchIdsOptions<TResult>
): Promise<(TResult | Error)[] | never> => {
  if (!ids.length) {
    return [];
  }

  const { fields, limit } = options ?? {};

  const qb = manager.createQueryBuilder(classRef, parentAlias).whereInIds(ids);

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
        `Could not load relation '${relation}' for '${id}'`,
        LogContext.DATA_LOADER
      )
  );
};

export const findByBatchIdsNew = async <
  TParent extends { id: string } & { [key: string]: any }, // todo better type
  TResult
>(
  manager: EntityManager,
  classRef: Type<TParent>,
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
      `'relations' support only one top level relation, '${relationKeys}' found instead`
    );
  }

  const { fields, limit } = options ?? {};

  const results = await manager.find(classRef, {
    take: limit,
    where: {
      id: In(ids),
    } as FindOptionsWhere<TParent>,
    relations: relations,
    select: fields,
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
