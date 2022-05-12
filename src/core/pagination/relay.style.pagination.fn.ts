import {
  Equal,
  LessThan,
  MoreThan,
  MoreThanOrEqual,
  SelectQueryBuilder,
} from 'typeorm';
import { Logger } from '@nestjs/common';
import { IBaseAlkemio } from '@src/domain';
import { LogContext } from '@src/common';
import { IRelayStyleEdge, IRelayStylePaginatedType, PaginationArgs } from './';
import { tryValidateArgs } from './validate.pagination.args';
import { EntityNotFoundException } from '@src/common';

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
          "displayName": "hub admin"
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
          "displayName": "hub member"
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

  query.orderBy({ [SORTING_COLUMN]: 'ASC' });

  const originalQuery = query.clone();
  const hasWhere =
    query.expressionMap.wheres && query.expressionMap.wheres.length > 0;

  let afterRowIdResult: T | undefined = undefined;
  if (after) {
    const queryAfterRowId = originalQuery.clone();
    afterRowIdResult = await queryAfterRowId
      .where({
        [cursorColumn]: Equal(after),
      })
      .getOne();
    if (afterRowIdResult == undefined) {
      throw new EntityNotFoundException(
        `Unable to find entity with ID: ${after}`,
        LogContext.CHALLENGES
      );
    }
  }

  let beforeRowIdResult: T | undefined = undefined;
  if (before) {
    const queryBeforeRowId = originalQuery.clone();
    beforeRowIdResult = await queryBeforeRowId
      .where({
        [cursorColumn]: Equal(before),
      })
      .getOne();
    if (beforeRowIdResult == undefined) {
      throw new EntityNotFoundException(
        `Unable to find entity with ID: ${after}`,
        LogContext.CHALLENGES
      );
    }
  }

  // FORWARD pagination
  if (first && afterRowIdResult) {
    query[hasWhere ? 'andWhere' : 'where']({
      [SORTING_COLUMN]: MoreThan(afterRowIdResult.rowId),
    });
    logger.verbose(`First ${first} After ${after}`);
  }
  // REVERSE pagination
  else if (last && beforeRowIdResult) {
    query[hasWhere ? 'andWhere' : 'where']({
      [SORTING_COLUMN]: LessThan(beforeRowIdResult.rowId),
    }).andWhere({
      [SORTING_COLUMN]: MoreThanOrEqual(beforeRowIdResult.rowId - last),
    });
    logger.verbose(`Last ${last} Before ${before}`);
  }
  const limit = first ?? DEFAULT_PAGE_ITEMS;
  query.take(limit);

  // todo: can we use getManyAndCount to optimize?
  const result = await query.getMany();
  logger.verbose(query.getQuery());

  const startCursorItem = result?.[0];
  const startCursor = startCursorItem?.[cursorColumn];

  const endCursorItem = result.slice(-1)?.[0];
  const endCursor = endCursorItem?.[cursorColumn];

  const beforeQuery = originalQuery.clone();
  const afterQuery = originalQuery.clone();

  let countBefore = 0;
  let countAfter = 0;
  // todo: can we simplify?
  if (hasWhere) {
    countBefore = await beforeQuery
      .andWhere({ [cursorColumn]: LessThan(startCursor) })
      .getCount();
    countAfter = await afterQuery
      .andWhere({ [cursorColumn]: MoreThan(endCursor) })
      .getCount();
  } else {
    countBefore = await beforeQuery
      .where({ [cursorColumn]: LessThan(startCursor) })
      .getCount();
    countAfter = await afterQuery
      .where({ [cursorColumn]: MoreThan(endCursor) })
      .getCount();
  }

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
