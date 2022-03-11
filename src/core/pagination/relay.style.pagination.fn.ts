import {
  LogContext,
  PaginationInputOutOfBoundException,
  PaginationNotFoundException,
} from '@src/common';
import { IBaseAlkemio } from '@src/domain';
import { IRelayStylePaginatedType } from './';

const DEFAULT_FIRST_VALUE = 5;

/***
 * @see https://relay.dev/graphql/connections.htm#sec-Pagination-algorithm
 * Generic function taking an object as a type
 * and returning relay styled paginated result based on the passed parameters
 * @param list The full list to extract a page from
 * @param first Non-negative integer. The amount of nodes after the cursor
 * @param after Cursor type. Object's UUID is used here
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
 */
export const getRelayStylePaginationResults = <T extends IBaseAlkemio>(
  list: T[],
  first?: number,
  after?: string
): IRelayStylePaginatedType<T> => {
  let useFirst = DEFAULT_FIRST_VALUE;

  if (first) {
    if (first < 0) {
      throw new PaginationInputOutOfBoundException(
        'Non-negative integer expected for parameter "first"',
        LogContext.COMMUNITY
      );
    }

    useFirst = first;
  }

  // initialize cursor
  let useAfter = list[0]?.id;
  // todo: validate for UUID
  if (after) {
    const index = list.findIndex(x => x.id === after);
    if (index === -1) {
      throw new PaginationNotFoundException(
        `Cursor item not found with id: (${after})`,
        LogContext.COMMUNITY
      );
    }
    useAfter = list[index + 1]?.id;
  }
  const indexAfter = list.findIndex(x => x.id === useAfter);

  const paginatedList = list.slice(indexAfter, indexAfter + useFirst);
  const firstItem = paginatedList[0];
  const lastItem = paginatedList[paginatedList.length - 1];

  return {
    edges: paginatedList.map(x => ({ node: x })),
    pageInfo: {
      startCursor: firstItem.id,
      endCursor: lastItem.id,
      hasNextPage: indexAfter + useFirst < list.length,
    },
  };
};
