import { Logger } from '@nestjs/common';
import { LogContext } from '@src/common/enums';
import { EntityNotFoundException } from '@src/common/exceptions';
import { IBaseAlkemio } from '@src/domain/common/entity/base-entity';
import {
  Brackets,
  Equal,
  LessThan,
  LessThanOrEqual,
  MoreThan,
  MoreThanOrEqual,
  ObjectLiteral,
  SelectQueryBuilder,
} from 'typeorm';
import { PaginationArgs } from './pagination.args';
import {
  IRelayStyleEdge,
  IRelayStylePageInfo,
  IRelayStylePaginatedType,
} from './relay.style.paginated.type';
import { tryValidateArgs } from './validate.pagination.args';

export type Paginationable = { rowId: number };

export interface PaginationOptions {
  /**
   * Name of a boolean column that partitions the result: rows where it is
   * true come first, then the rest, each group in the requested `rowId`
   * order. Cursors become composite `(flag, rowId)` keysets, so walking the
   * pages in either direction returns every row exactly once. When set, this
   * option owns the ORDER BY of the query (any existing order is replaced).
   */
  leadingBooleanDesc?: string;
}

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
 * @param options see {@link PaginationOptions}
 */
export const getRelayStylePaginationResults = async <
  T extends IBaseAlkemio & Paginationable,
>(
  query: SelectQueryBuilder<T>,
  paginationArgs: PaginationArgs,
  sort: 'ASC' | 'DESC' = 'ASC',
  cursorColumn = DEFAULT_CURSOR_COLUMN,
  options?: PaginationOptions
): Promise<IRelayStylePaginatedType<T>> => {
  const logger = new Logger(LogContext.PAGINATION);

  try {
    tryValidateArgs(paginationArgs);
  } catch (e) {
    const error = e as Error;

    logger.error(error.name, error.message);

    throw e;
  }

  if (options?.leadingBooleanDesc) {
    return getLeadingBooleanPaginationResults(
      query,
      paginationArgs,
      sort,
      cursorColumn,
      options.leadingBooleanDesc
    );
  }

  const { first, after, last, before } = paginationArgs;

  // Preserve existing orderBy clauses and only add rowId if not already present
  const existingOrderBys = query.expressionMap.orderBys || {};
  const hasExistingOrder = Object.keys(existingOrderBys).length > 0;

  if (hasExistingOrder) {
    // Add rowId as secondary sort for pagination efficiency, preserving existing primary sort
    const rowIdColumn = `${query.alias}.${SORTING_COLUMN}`;
    if (!existingOrderBys[rowIdColumn]) {
      query.addOrderBy(rowIdColumn, sort);
    }
  } else {
    // No existing order, use rowId as primary sort
    query.orderBy({
      [`${query.alias}.${SORTING_COLUMN}`]: sort,
    });
  }
  // Transforms UUID cursor into rowId cursor
  const rowId = await getRowIdFromCursor(query, cursorColumn, before, after);
  query = enforceCursor(query, first, last, rowId, sort);

  const limit = first ?? last ?? DEFAULT_PAGE_ITEMS;
  query.take(limit);

  // todo: can we use getManyAndCount to optimize?
  const result = await query.getMany();

  const pageInfo = await getPageInfo(query, cursorColumn, sort);

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

const enforceCursor = <T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  first: number | undefined,
  last: number | undefined,
  rowId: number | undefined,
  sort: 'ASC' | 'DESC'
) => {
  if (rowId == undefined) {
    return query;
  }

  const hasWhere =
    query.expressionMap.wheres && query.expressionMap.wheres.length > 0;

  if (first) {
    // Finds all rows for which rowId > rowIdcursor
    return query.clone()[hasWhere ? 'andWhere' : 'where']({
      [SORTING_COLUMN]: sort === 'ASC' ? MoreThan(rowId) : LessThan(rowId),
    });
  }

  if (last) {
    // Finds all rows for which rowIdcursor > rowId >= rowIdcursor - last
    return query
      .clone()
      [hasWhere ? 'andWhere' : 'where']({
        [SORTING_COLUMN]: sort === 'ASC' ? LessThan(rowId) : MoreThan(rowId),
      })
      .andWhere({
        [SORTING_COLUMN]:
          sort === 'ASC'
            ? MoreThanOrEqual(rowId - last)
            : LessThanOrEqual(rowId - last),
      });
  }

  return query;
};

const getPageInfo = async <T extends IBaseAlkemio & Paginationable>(
  query: SelectQueryBuilder<T>,
  cursorColumn: typeof DEFAULT_CURSOR_COLUMN,
  sort: 'ASC' | 'DESC'
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
      [SORTING_COLUMN]:
        sort === 'ASC'
          ? LessThan(startCursorRowId)
          : MoreThan(startCursorRowId),
    })
    .getCount();
  const countAfter = await query
    .clone()
    [hasWhere ? 'andWhere' : 'where']({
      [SORTING_COLUMN]:
        sort === 'ASC' ? MoreThan(endCursorRowId) : LessThan(endCursorRowId),
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

/**
 * Keyset pagination over the order `flag DESC, rowId <sort>`.
 *
 * A single-key `rowId` cursor cannot page such an order: after a promoted row
 * the next page must continue with the remaining promoted rows and then the
 * non-promoted ones from the start of the `rowId` range, which `rowId > x`
 * cannot express (it skips or repeats rows). The cursor is therefore the
 * pair `(flag, rowId)` of the cursor row, and "after" means: a lower flag
 * (false sorts before true in Postgres, so lower = later here), or the same
 * flag and a later `rowId`.
 *
 * Backward pages (`last`/`before`) are read in the reverse order and flipped
 * in memory, so `last: n` returns exactly the n rows preceding the cursor.
 * `hasPreviousPage`/`hasNextPage` are computed against the un-cursored query
 * with the same keyset predicates, so both are exact in both directions.
 */
const getLeadingBooleanPaginationResults = async <
  T extends IBaseAlkemio & Paginationable,
>(
  query: SelectQueryBuilder<T>,
  paginationArgs: PaginationArgs,
  sort: 'ASC' | 'DESC',
  cursorColumn: typeof DEFAULT_CURSOR_COLUMN,
  flagColumn: string
): Promise<IRelayStylePaginatedType<T>> => {
  const { first, after, last, before } = paginationArgs;
  const backward = first === undefined && last !== undefined;
  const flag = `${query.alias}.${flagColumn}`;
  const rowId = `${query.alias}.${SORTING_COLUMN}`;
  const reverseSort = sort === 'ASC' ? 'DESC' : 'ASC';

  // The un-cursored query: page-info counts run against it.
  const base = query.clone();

  query
    .orderBy(flag, backward ? 'ASC' : 'DESC')
    .addOrderBy(rowId, backward ? reverseSort : sort);

  const cursor = before ?? after;
  if (cursor) {
    const cursorEntity = await findCursorEntity(query, cursorColumn, cursor);
    const key = toKeyset(cursorEntity, flagColumn);
    query = andWhereKeyset(
      query,
      backward
        ? precedesKeyset(flag, rowId, sort, key, 'cursor')
        : followsKeyset(flag, rowId, sort, key, 'cursor')
    );
  }

  query.take(first ?? last ?? DEFAULT_PAGE_ITEMS);

  const result = await query.getMany();
  if (backward) {
    result.reverse();
  }

  const startItem = result[0];
  const endItem = result[result.length - 1];

  let hasPreviousPage = false;
  let hasNextPage = false;
  if (startItem && endItem) {
    const [countBefore, countAfter] = await Promise.all([
      andWhereKeyset(
        base.clone(),
        precedesKeyset(
          flag,
          rowId,
          sort,
          toKeyset(startItem, flagColumn),
          'start'
        )
      ).getCount(),
      andWhereKeyset(
        base.clone(),
        followsKeyset(flag, rowId, sort, toKeyset(endItem, flagColumn), 'end')
      ).getCount(),
    ]);
    hasPreviousPage = countBefore > 0;
    hasNextPage = countAfter > 0;
  }

  return {
    edges: result.map<IRelayStyleEdge<T>>(x => ({ node: x })),
    pageInfo: {
      startCursor: startItem?.[cursorColumn],
      endCursor: endItem?.[cursorColumn],
      hasNextPage,
      hasPreviousPage,
    },
  };
};

type Keyset = { flag: boolean; rowId: number };

type KeysetPredicate = {
  sql: string;
  parameters: Record<string, unknown>;
};

const toKeyset = (entity: Paginationable, flagColumn: string): Keyset => ({
  flag:
    (entity as Paginationable & Record<string, unknown>)[flagColumn] === true,
  rowId: entity.rowId,
});

/** Rows strictly after `key` in the order `flag DESC, rowId <sort>`. */
const followsKeyset = (
  flag: string,
  rowId: string,
  sort: 'ASC' | 'DESC',
  key: Keyset,
  name: string
): KeysetPredicate => {
  const flagParam = `keysetFlag_${name}`;
  const rowIdParam = `keysetRowId_${name}`;
  return {
    sql: `(${flag} < :${flagParam} OR (${flag} = :${flagParam} AND ${rowId} ${sort === 'ASC' ? '>' : '<'} :${rowIdParam}))`,
    parameters: { [flagParam]: key.flag, [rowIdParam]: key.rowId },
  };
};

/** Rows strictly before `key` in the order `flag DESC, rowId <sort>`. */
const precedesKeyset = (
  flag: string,
  rowId: string,
  sort: 'ASC' | 'DESC',
  key: Keyset,
  name: string
): KeysetPredicate => {
  const flagParam = `keysetFlag_${name}`;
  const rowIdParam = `keysetRowId_${name}`;
  return {
    sql: `(${flag} > :${flagParam} OR (${flag} = :${flagParam} AND ${rowId} ${sort === 'ASC' ? '<' : '>'} :${rowIdParam}))`,
    parameters: { [flagParam]: key.flag, [rowIdParam]: key.rowId },
  };
};

const andWhereKeyset = <T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  predicate: KeysetPredicate
): SelectQueryBuilder<T> => {
  const hasWhere =
    query.expressionMap.wheres && query.expressionMap.wheres.length > 0;
  return query[hasWhere ? 'andWhere' : 'where'](
    new Brackets(qb => qb.where(predicate.sql, predicate.parameters))
  );
};

const findCursorEntity = async <T extends IBaseAlkemio & Paginationable>(
  query: SelectQueryBuilder<T>,
  cursorColumn: string,
  cursor: string
): Promise<T> => {
  const hasWhere =
    query.expressionMap.wheres && query.expressionMap.wheres.length > 0;

  const cursorEntity = await query
    .clone()
    [hasWhere ? 'andWhere' : 'where']({
      [cursorColumn]: Equal(cursor),
    })
    .getOne();

  if (!cursorEntity) {
    throw new EntityNotFoundException(
      `Unable to find entity with ID: ${cursor}`,
      LogContext.PAGINATION
    );
  }

  return cursorEntity;
};
