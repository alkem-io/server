import { ValidationException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { SearchInput } from '../dto/inputs';

const SEARCH_TERM_LIMIT = 10;
const TAGSET_NAMES_LIMIT = 2;

export const validateSearchParameters = (
  searchData: SearchInput,
  validationOptions: {
    maxSearchResults: number;
  }
) => {
  const { maxSearchResults } = validationOptions;
  const { tagsetNames, terms, filters = [] } = searchData;
  if (terms.length > SEARCH_TERM_LIMIT) {
    throw new ValidationException(
      `Maximum number of search terms is ${SEARCH_TERM_LIMIT}; supplied: ${searchData.terms.length}`,
      LogContext.SEARCH
    );
  }
  // Check limit on tagsets that can be searched
  if (tagsetNames && tagsetNames.length > TAGSET_NAMES_LIMIT) {
    throw new ValidationException(
      `Maximum number of tagset names is ${TAGSET_NAMES_LIMIT}; supplied: ${tagsetNames.length}`,
      LogContext.SEARCH
    );
  }
  // validate pagination args
  let totalSizeFromFilters = 0;
  for (const { size } of filters) {
    if (size < 0) {
      throw new ValidationException(
        'Size cannot be a negative number',
        LogContext.SEARCH
      );
    }

    totalSizeFromFilters += size;
  }
  // calculate & validate the max result size
  if (totalSizeFromFilters > maxSearchResults) {
    throw new ValidationException(
      `The requested ${totalSizeFromFilters} results cannot exceed the maximum allowed ${maxSearchResults} over all categories.`,
      LogContext.SEARCH
    );
  }
};
