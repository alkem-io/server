import { ValidationException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { SearchEntityTypes } from '../search.entity.types';
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
  if (tagsetNames && tagsetNames.length > TAGSET_NAMES_LIMIT)
    throw new ValidationException(
      `Maximum number of tagset names is ${TAGSET_NAMES_LIMIT}; supplied: ${tagsetNames.length}`,
      LogContext.SEARCH
    );
  // Check only allowed entity types supplied
  const entityTypes = searchData.typesFilter;
  if (entityTypes) {
    entityTypes.forEach(entityType => {
      if (
        !Object.values(SearchEntityTypes).includes(
          entityType as SearchEntityTypes
        )
      ) {
        throw new ValidationException(
          `Not allowed typeFilter encountered: ${entityType}`,
          LogContext.SEARCH
        );
      }
    });
  }
};
