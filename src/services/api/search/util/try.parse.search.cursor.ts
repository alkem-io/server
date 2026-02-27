import { LogContext } from '@common/enums';
import { BaseExceptionInternal } from '@common/exceptions/internal/base.exception.internal';
import { isUUID } from 'class-validator';

/**
 * Will try to parse a search cursor. Will throw if the cursor is invalid.
 * @see calculateSearchCursor
 * @throws BaseExceptionInternal on invalid cursor
 */
export const tryParseSearchCursor = (
  cursor: string
): { score: number; id: string } | never => {
  if (!cursor) {
    throw new BaseExceptionInternal('Invalid search cursor', LogContext.SEARCH);
  }

  const { score, id } = parseSearchCursor(cursor);

  if (isNaN(score)) {
    throw new BaseExceptionInternal(
      'Invalid first part of cursor',
      LogContext.SEARCH
    );
  }

  if (!id || !isUUID(id)) {
    throw new BaseExceptionInternal(
      'Invalid second part of cursor',
      LogContext.SEARCH
    );
  }

  return { score, id };
};

/**
 * Will parse a search cursor. Will not throw if the cursor is invalid.
 * @param cursor
 */
export const parseSearchCursor = (cursor: string) => {
  const [scoreStr, id] = cursor.split('::');
  const score = parseFloat(scoreStr);

  return { score, id };
};
