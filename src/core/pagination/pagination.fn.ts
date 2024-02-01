import { SelectQueryBuilder } from 'typeorm';
import { IBaseAlkemio } from '@src/domain/common/entity/base-entity';
import { IPaginatedType } from './paginated.type';
import {
  getRelayStylePaginationResults,
  Paginationable,
  PaginationArgs,
} from './';

export const getPaginationResults = async <
  T extends IBaseAlkemio & Paginationable
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
