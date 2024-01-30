import {
  Equal,
  LessThan,
  MoreThan,
  MoreThanOrEqual,
  SelectQueryBuilder,
} from 'typeorm';
import { Logger } from '@nestjs/common';
import { IBaseAlkemio } from '@src/domain/common/entity/base-entity';
import { LogContext } from '@src/common/enums';
import { tryValidateArgs } from './validate.pagination.args';
import { EntityNotFoundException } from '@src/common/exceptions';
import { PaginationArgs } from './pagination.args';
import {
  IRelayStyleEdge,
  IRelayStylePageInfo,
  IRelayStylePaginatedType,
} from './relay.style.paginated.type';

export type Paginationable = { rowId: number };

const DEFAULT_PAGE_ITEMS = 25;
const DEFAULT_CURSOR_COLUMN: keyof IBaseAlkemio = 'id';
const SORTING_COLUMN: keyof Paginationable = 'rowId';

/***
 * @see https://relay.dev/graphql/connections.htm#sec-Pagination-algorithm
 * Generic function taking an object as a type
 * and returning relay styled paginated result based on the passed parameters
 * @example
 "users": {
    "pageInfo": {
      "hasNextPage": true
    },
    "edges": [
      {
        "node": {
          "id": "03edfab2-fd65-4bb2-94f9-bbd35bb369cf",
          "displayName": "space admin"
        }
      },
      {
        "node": {
          "id": "90e13a5c-0d7f-421b-9266-7e5f8eae5045",
          "displayName": "notifications admin"
        }
      },
      {
        "node": {
          "id": "9d1969de-2551-4eb8-bbd2-bf8963f1b71f",
          "displayName": "space member"
        }
      }
    ]
  }

 * !!! The pagination algorithm provided in the link about is not strictly followed !!!
 * @param query A *SelectQueryBuilder*. You can provide it from the entity's repository class
 * @param paginationArgs
 * @param sort
 * @param cursorColumn
 */
export const getRelayStylePaginationResults = async <
  T extends IBaseAlkemio & Paginationable
>(
  query: SelectQueryBuilder<T>,
  paginationArgs: PaginationArgs,
  sort: 'ASC' | 'DESC' = 'ASC',
  cursorColumn = DEFAULT_CURSOR_COLUMN
): Promise<IRelayStylePaginatedType<T>> => {
  const logger = new Logger(LogContext.PAGINATION);

  try {
    tryValidateArgs(paginationArgs);
  } catch (e) {
    const error = e as Error;

    logger.error(error.name, error.message);

    throw e;
  }

  const { first, after, last, before } = paginationArgs;

  query.orderBy({
    [`${query.alias}.${SORTING_COLUMN}`]: sort,
    ...query.expressionMap.orderBys,
  });
  // Transforms UUID cursor into rowId cursor
  const rowId = await getRowIdFromCursor(query, cursorColumn, before, after);
  query = enforceCursor(query, first, last, rowId);

  const limit = first ?? last ?? DEFAULT_PAGE_ITEMS;
  query.take(limit);

  // todo: can we use getManyAndCount to optimize?
  const result = await query.getMany();

  const pageInfo = await getPageInfo(query, cursorColumn);

  const edges = result.map<IRelayStyleEdge<T>>(x => ({ node: x }));

  return { edges, pageInfo };
};

const getRowIdFromCursor = async <T extends IBaseAlkemio & Paginationable>(
  query: SelectQueryBuilder<T>,
  cursorColumn: string,
  before: string | undefined,
  after: string | undefined
) => {
  const cursor = before ?? after;
  if (!cursor) {
    return undefined;
  }

  const hasWhere =
    query.expressionMap.wheres && query.expressionMap.wheres.length > 0;

  const rowIdCursorResult = await query
    .clone()
    [hasWhere ? 'andWhere' : 'where']({
      [cursorColumn]: Equal(cursor),
    })
    .getOne();

  if (!rowIdCursorResult) {
    throw new EntityNotFoundException(
      `Unable to find entity with ID: ${cursor}`,
      LogContext.PAGINATION
    );
  }

  return rowIdCursorResult.rowId;
};

const enforceCursor = <T>(
  query: SelectQueryBuilder<T>,
  first: number | undefined,
  last: number | undefined,
  rowId: number | undefined
) => {
  if (rowId == undefined) {
    return query;
  }

  const hasWhere =
    query.expressionMap.wheres && query.expressionMap.wheres.length > 0;

  if (first) {
    // Finds all rows for which rowId > rowIdcursor
    return query.clone()[hasWhere ? 'andWhere' : 'where']({
      [SORTING_COLUMN]: MoreThan(rowId),
    });
  }

  if (last) {
    // Finds all rows for which rowIdcursor > rowId >= rowIdcursor - last
    return query
      .clone()
      [hasWhere ? 'andWhere' : 'where']({
        [SORTING_COLUMN]: LessThan(rowId),
      })
      .andWhere({
        [SORTING_COLUMN]: MoreThanOrEqual(rowId - last),
      });
  }

  return query;
};

const getPageInfo = async <T extends IBaseAlkemio & Paginationable>(
  query: SelectQueryBuilder<T>,
  cursorColumn: typeof DEFAULT_CURSOR_COLUMN
): Promise<IRelayStylePageInfo> => {
  const result = await query.getMany();

  const startCursorItem = result?.[0];
  const startCursor = startCursorItem?.[cursorColumn];
  const startCursorRowId = startCursorItem?.[SORTING_COLUMN];

  const endCursorItem = result.slice(-1)?.[0];
  const endCursor = endCursorItem?.[cursorColumn];
  const endCursorRowId = endCursorItem?.[SORTING_COLUMN];

  const hasWhere =
    query.expressionMap.wheres && query.expressionMap.wheres.length > 0;

  const countBefore = await query
    .clone()
    [hasWhere ? 'andWhere' : 'where']({
      [SORTING_COLUMN]: LessThan(startCursorRowId),
    })
    .getCount();
  const countAfter = await query
    .clone()
    [hasWhere ? 'andWhere' : 'where']({
      [SORTING_COLUMN]: MoreThan(endCursorRowId),
    })
    .getCount();

  const hasNextPage = countAfter > 0;
  const hasPreviousPage = countBefore > 0;

  return {
    startCursor,
    endCursor,
    hasNextPage,
    hasPreviousPage,
  };
};
