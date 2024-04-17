import { ValidationException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { SearchInput } from '@services/api/search';

const SEARCH_TERM_LIMIT = 10;
const TAGSET_NAMES_LIMIT = 2;
// todo deduplicate with search.service.ts
enum SearchEntityTypes {
  USER = 'user',
  GROUP = 'group',
  ORGANIZATION = 'organization',
  SPACE = 'space',
  SUBSPACE = 'subspace',
  POST = 'post',
}

const SEARCH_ENTITIES: string[] = [
  SearchEntityTypes.USER,
  SearchEntityTypes.GROUP,
  SearchEntityTypes.ORGANIZATION,
  SearchEntityTypes.SPACE,
  SearchEntityTypes.SUBSPACE,
  SearchEntityTypes.POST,
];

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
      if (!SEARCH_ENTITIES.includes(entityType))
        throw new ValidationException(
          `Not allowed typeFilter encountered: ${entityType}`,
          LogContext.SEARCH
        );
    });
  }
};
