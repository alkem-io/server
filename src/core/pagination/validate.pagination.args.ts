import { PaginationArgs } from '@core/pagination/pagination.args';
import {
  PaginationInputOutOfBoundException,
  PaginationParameterNotFoundException,
} from '@src/common';

export const tryValidateArgs = (
  paginationArgs: PaginationArgs
): boolean | never => {
  const { first, after, last, before } = paginationArgs;

  if (first !== undefined && first <= 0) {
    throw new PaginationInputOutOfBoundException(
      'Parameter "first" needs to be positive.'
    );
  }

  if (after) {
    if (first == undefined) {
      throw new PaginationParameterNotFoundException(
        'Cursor "after" requires having "first" parameter.'
      );
    }
  }

  if (last !== undefined && last <= 0) {
    console.log('\n\n\n nula prvi put ===================== \n\n\n');
    throw new PaginationInputOutOfBoundException(
      'Parameter "last" needs to be positive.'
    );
  }

  if (before) {
    if (last == undefined) {
      console.log('\n\n\n nula ===================== \n\n\n');
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
