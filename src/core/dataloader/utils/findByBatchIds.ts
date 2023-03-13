import { EntityManager, EntityTarget, Repository } from 'typeorm';
import { EntityRelations } from '@src/types';
import { Type } from '@nestjs/common';

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
        new Error(`Could not load relation '${relation}' for '${id}'`)
  );
};
