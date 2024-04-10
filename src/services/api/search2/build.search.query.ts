import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

export const buildSearchQuery = (
  terms: string,
  spaceIdFilter?: string
): QueryDslQueryContainer => ({
  bool: {
    must: [
      {
        multi_match: {
          query: terms,
          type: 'most_fields',
          fields: ['*'],
        },
      },
    ],
    filter: spaceIdFilter ? [{ match: { spaceID: spaceIdFilter } }] : undefined,
  },
});
