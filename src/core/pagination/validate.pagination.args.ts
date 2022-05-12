import { PaginationArgs } from '@core/pagination/pagination.args';
import {
  PaginationInputOutOfBoundException,
  PaginationParameterNotFoundException,
} from '@src/common';

export const tryValidateArgs = (
  paginationArgs: PaginationArgs
): boolean | never => {
  const { first, after, last, before } = paginationArgs;

  if (first && first < 0) {
    throw new PaginationInputOutOfBoundException(
      'Parameter "first" needs to be non-negative.'
    );
  }

  if (after) {
    if (!first) {
      throw new PaginationParameterNotFoundException(
        'Cursor "after" requires having "after" parameter.'
      );
    }
  }

  if (last && last < 0) {
    throw new PaginationInputOutOfBoundException(
      'Parameter "last" needs to be non-negative.'
    );
  }

  if (before) {
    if (!last) {
      throw new PaginationParameterNotFoundException(
        'Cursor "before" requires having "last" parameter.'
      );
    }
  }

  if (first && last) {
    throw new PaginationInputOutOfBoundException(
      'Using both "first" and "last" parameters is discouraged.'
    );
  }

  return true;
};
