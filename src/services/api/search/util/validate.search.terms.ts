import { ValidationException } from '@common/exceptions';
import { LogContext } from '@common/enums';

const TERM_MINIMUM_LENGTH = 2;

export const validateSearchTerms = (terms: string[]): string[] => {
  const filteredTerms: string[] = [];
  for (const term of terms) {
    if (term.length < TERM_MINIMUM_LENGTH) {
      throw new ValidationException(
        `Search: Skipping term below minimum length: ${term}`,
        LogContext.SEARCH
      );
    } else {
      filteredTerms.push(term);
    }
  }
  return filteredTerms;
};
