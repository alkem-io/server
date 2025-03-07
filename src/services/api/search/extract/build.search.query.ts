import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

export const buildSearchQuery = (
  terms: string,
  options?: {
    spaceIdFilter?: string;
  }
): QueryDslQueryContainer => {
  const { spaceIdFilter } = options ?? {};
  return {
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
      // apply some filters on the results
      filter: buildFilter({ spaceIdFilter }),
    },
  };
};

const buildFilter = (opts?: {
  spaceIdFilter?: string;
}): QueryDslQueryContainer | undefined => {
  const { spaceIdFilter } = opts ?? {};

  const filters: QueryDslQueryContainer[] = [];

  if (spaceIdFilter) {
    filters.push({
      bool: {
        // match either of the two conditions
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
