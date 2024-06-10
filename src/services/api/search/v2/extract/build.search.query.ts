import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

export const buildSearchQuery = (
  terms: string,
  spaceIdFilter?: string
): QueryDslQueryContainer => ({
  bool: {
    must: [
      {
        // match the terms in any TEXT field
        // accumulate the score from all fields - more matches on more fields will result in a higher score
        multi_match: {
          query: terms,
          type: 'most_fields',
          fields: ['*'],
        },
      },
    ],
    // filter the results by the spaceID
    filter: buildFilter(spaceIdFilter),
  },
});

const buildFilter = (
  spaceIdFilter?: string
): QueryDslQueryContainer | undefined => {
  if (!spaceIdFilter) {
    return undefined;
  }

  return {
    bool: {
      minimum_should_match: 1,
      should: [
        // the spaceID field is not applicable for some entities,
        // so we want them included in the results
        {
          bool: {
            must_not: {
              exists: {
                field: 'spaceID',
              },
            },
          },
        },
        // if the spaceID field exists, we want to filter by it
        {
          term: {
            spaceID: spaceIdFilter,
          },
        },
      ],
    },
  };
};
