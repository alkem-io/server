import { SpaceVisibility } from '@common/enums/space.visibility';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

export const buildSearchQuery = (
  terms: string,
  spaceIdFilter?: string,
  onlyPublicResults: boolean = false
): QueryDslQueryContainer => ({
  bool: {
    must: [
      {
        // Match the terms in any TEXT field
        // Accumulate the score from all fields - more matches on more fields will result in a higher score
        multi_match: {
          query: terms,
          type: 'most_fields',
          fields: ['*'],
        },
      },
    ],
    // Filter the results by the spaceID and visibility
    filter: buildFilter(
      spaceIdFilter,
      onlyPublicResults === true ? SpaceVisibility.ACTIVE : undefined
    ),
  },
});

const buildFilter = (
  spaceIdFilter?: string,
  visibilityFilter?: string
): QueryDslQueryContainer | undefined => {
  const filters: QueryDslQueryContainer[] = [];

  if (spaceIdFilter) {
    filters.push({
      bool: {
        minimum_should_match: 1,
        should: [
          // Include entities without spaceID
          {
            bool: {
              must_not: {
                exists: {
                  field: 'spaceID',
                },
              },
            },
          },
          // Filter entities with the specified spaceID
          {
            term: {
              spaceID: spaceIdFilter,
            },
          },
        ],
      },
    });
  }

  if (visibilityFilter) {
    filters.push({
      term: {
        visibility: visibilityFilter,
      },
    });
  }

  if (filters.length === 0) {
    return undefined;
  }

  return {
    bool: {
      must: filters,
    },
  };
};
