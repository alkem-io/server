import { Repository } from 'typeorm';

const parentAlias = 'parent';
const resultAlias = 'relation';

export const findByBatchIds = async <TParent, TResult>(
  repo: Repository<TParent>,
  ids: string[],
  relation: string, // todo typed of TParent like EntityFieldsNames
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

  const { fields, limit } = options ?? {};
  // todo make alias based in TResult name
  const qb = repo.createQueryBuilder(parentAlias).whereInIds(ids);

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

  console.time('get');
  const results = await qb.getMany();

  // return ids.map(
  //   id =>
  //     results.find(result => result.id === id)?.profile ||
  //     new EntityNotFoundException(
  //       `Could not load user ${id}`,
  //       LogContext.COMMUNITY
  //     )
  // );
  return [];
};
