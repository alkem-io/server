import { ValidationException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { SearchInput } from '../dto';
import { tryParseSearchCursor } from './try.parse.search.cursor';

const SEARCH_TERM_LIMIT = 10;
const TAGSET_NAMES_LIMIT = 2;

export const validateSearchParameters = (
  searchData: SearchInput,
  validationOptions: {
    maxSearchResults: number;
  }
) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { maxSearchResults } = validationOptions;
  const {
    cursor,
    size: resultsPerCategory,
    tagsetNames,
    terms,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    categories,
  } = searchData;
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
  if (cursor) {
    try {
      tryParseSearchCursor(cursor);
    } catch (e: any) {
      throw new ValidationException(
        `Invalid cursor provided: ${e?.message}`,
        LogContext.SEARCH,
        { originalException: e }
      );
    }
  }

  if (resultsPerCategory < 0) {
    throw new ValidationException(
      'Size cannot be a negative number',
      LogContext.SEARCH
    );
  }
  // todo:how to limit results
  // const listedCategories =
  //   categories?.length ?? Object.keys(SearchCategory).length;
  // const totalResultCount = resultsPerCategory * listedCategories;
  // if (totalResultCount > maxSearchResults) {
  //   throw new ValidationException(
  //     `The total result count cannot exceeds the maximum allowed ${maxSearchResults}. ${resultsPerCategory} results per category * ${listedCategories} categories.`,
  //     LogContext.SEARCH
  //   );
  // }
};
