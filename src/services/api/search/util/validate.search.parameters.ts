import { ValidationException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { SearchInput } from '../dto';

const SEARCH_TERM_LIMIT = 10;
const TAGSET_NAMES_LIMIT = 2;

export const validateSearchParameters = (searchData: SearchInput) => {
  if (searchData.terms.length > SEARCH_TERM_LIMIT)
    throw new ValidationException(
      `Maximum number of search terms is ${SEARCH_TERM_LIMIT}; supplied: ${searchData.terms.length}`,
      LogContext.SEARCH
    );
  // Check limit on tagsets that can be searched
  const tagsetNames = searchData.tagsetNames;
  if (tagsetNames && tagsetNames.length > TAGSET_NAMES_LIMIT) {
    throw new ValidationException(
      `Maximum number of tagset names is ${TAGSET_NAMES_LIMIT}; supplied: ${tagsetNames.length}`,
      LogContext.SEARCH
    );
  }
};
