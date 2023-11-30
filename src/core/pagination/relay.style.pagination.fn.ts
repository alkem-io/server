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
 * @param query A *SelectQueryBuilder*. You can provided it from  from the entity's repository class
 * @param paginationArgs
 * @param cursorColumn
 */
// todo: simplify; break in smaller functions; fix jsdoc
export const getRelayStylePaginationResults = async <
  T extends IBaseAlkemio & Paginationable
>(
  query: SelectQueryBuilder<T>,
  paginationArgs: PaginationArgs,
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

  const hasOrderBy =
    query.expressionMap.orderBys &&
    Object.keys(query.expressionMap.orderBys).length > 0;

  if (hasOrderBy) {
    query.addOrderBy(`${query.alias}.${SORTING_COLUMN}`, 'ASC');
  } else {
    query.orderBy({ [`${query.alias}.${SORTING_COLUMN}`]: 'ASC' });
  }

  const originalQuery = query.clone();
  const hasWhere =
    query.expressionMap.wheres && query.expressionMap.wheres.length > 0;

  // Transforms UUID cursor into rowId cursor
  let rowIdcursor: number | undefined = undefined;
  const cursorFromUser = before ?? after ?? undefined;
  if (cursorFromUser) {
    const queryRowId = originalQuery.clone();
    const rowIdCursorResult = await queryRowId[hasWhere ? 'andWhere' : 'where'](
      {
        [cursorColumn]: Equal(cursorFromUser),
      }
    ).getOne();
    if (rowIdCursorResult == undefined) {
      throw new EntityNotFoundException(
        `Unable to find entity with ID: ${after}`,
        LogContext.CHALLENGES
      );
    }
    rowIdcursor = rowIdCursorResult.rowId;
  }

  // FORWARD pagination
  if (first && rowIdcursor) {
    // Finds all rows for which rowId > rowIdcursor
    query[hasWhere ? 'andWhere' : 'where']({
      [SORTING_COLUMN]: MoreThan(rowIdcursor),
    });
    logger.verbose(`First ${first} After ${after}`);
  }
  // REVERSE pagination
  if (last && rowIdcursor) {
    // Finds all rows for which rowIdcursor > rowId >= rowIdcursor - last
    query[hasWhere ? 'andWhere' : 'where']({
      [SORTING_COLUMN]: LessThan(rowIdcursor),
    }).andWhere({
      [SORTING_COLUMN]: MoreThanOrEqual(rowIdcursor - last),
    });
    logger.verbose(`Last ${last} Before ${before}`);
  }

  const limit = first ?? last ?? DEFAULT_PAGE_ITEMS;
  query.take(limit);

  // todo: can we use getManyAndCount to optimize?
  const result = await query.getMany();
  logger.verbose(query.getQuery());

  const startCursorItem = result?.[0];
  const startCursor = startCursorItem?.[cursorColumn];
  const startCursorRowId = startCursorItem?.[SORTING_COLUMN];

  const endCursorItem = result.slice(-1)?.[0];
  const endCursor = endCursorItem?.[cursorColumn];
  const endCursorRowId = endCursorItem?.[SORTING_COLUMN];

  const beforeQuery = originalQuery.clone();
  const afterQuery = originalQuery.clone();

  const countBefore = await beforeQuery[hasWhere ? 'andWhere' : 'where']({
    [SORTING_COLUMN]: LessThan(startCursorRowId),
  }).getCount();
  const countAfter = await afterQuery[hasWhere ? 'andWhere' : 'where']({
    [SORTING_COLUMN]: MoreThan(endCursorRowId),
  }).getCount();

  logger.verbose(`Items before ${startCursor}: ${countBefore}`);
  logger.verbose(`Items after ${endCursor}: ${countAfter}`);

  const edges = result.map<IRelayStyleEdge<T>>(x => ({ node: x }));

  const hasNextPage = countAfter > 0;
  const hasPreviousPage = countBefore > 0;

  return {
    edges,
    pageInfo: {
      startCursor,
      endCursor,
      hasNextPage,
      hasPreviousPage,
    },
  };
};
