import { IBaseAlkemio } from '@src/domain/common/entity/base-entity';
import { SelectQueryBuilder } from 'typeorm';
import {
  getRelayStylePaginationResults,
  PaginationArgs,
  Paginationable,
} from './';
import { IPaginatedType } from './paginated.type';

export const getPaginationResults = async <
  T extends IBaseAlkemio & Paginationable,
>(
  query: SelectQueryBuilder<T>,
  paginationArgs: PaginationArgs,
  sort?: 'ASC' | 'DESC'
): Promise<IPaginatedType<T>> => {
  const total = await query.getCount();
  const result = await getRelayStylePaginationResults(
    query,
    paginationArgs,
    sort
  );

  return {
    total,
    items: result.edges.map(x => x.node),
    pageInfo: result.pageInfo,
  };
};
