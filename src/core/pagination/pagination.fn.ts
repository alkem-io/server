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
  paginationArgs: PaginationArgs
): Promise<IPaginatedType<T>> => {
  const result = await getRelayStylePaginationResults(query, paginationArgs);

  return {
    items: result.edges.map(x => x.node),
    pageInfo: result.pageInfo,
  };
};
