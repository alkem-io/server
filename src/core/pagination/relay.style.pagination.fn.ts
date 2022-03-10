import {
  LogContext,
  PaginationInputException,
  PaginationNotfoundException,
} from '@src/common';
import { IBaseAlkemio } from '@src/domain';
import { IRelayStylePaginatedType } from './';

const DEFAULT_FIRST_VALUE = 5;

export const getRelayStylePaginationResults = <T extends IBaseAlkemio>(
  list: T[],
  first: number,
  after: string,
  defaultFirst = DEFAULT_FIRST_VALUE
): IRelayStylePaginatedType<T> => {
  // todo: extract to const
  let useFirst = defaultFirst;

  if (first) {
    if (first < 0) {
      throw new PaginationInputException(
        'Non-negative integer expected for parameter "first"',
        LogContext.COMMUNITY
      );
    }

    useFirst = first;
  }

  // initialise cursor
  let useAfter = list[0]?.id;
  // todo: validate for UUID
  if (after) {
    const index = list.findIndex(x => x.id === after);
    if (index === -1) {
      throw new PaginationNotfoundException(
        `Item not found with id: (${after})`,
        LogContext.COMMUNITY
      );
    }
    useAfter = list[index + 1]?.id;
  }
  // todo: same as line 131
  const indexAfter = list.findIndex(x => x.id === useAfter);

  const paginatedList = list.slice(indexAfter, indexAfter + useFirst);
  const lastItem = list[list.length - 1];

  return {
    edges: paginatedList.map(x => ({
      cursor: x.id,
      node: x,
    })),
    pageInfo: {
      endCursor: lastItem.id,
      hasNextPage: list.length > indexAfter,
    },
  };
};
