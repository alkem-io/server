import { QueryDslFunctionScoreContainer } from '@elastic/elasticsearch/lib/api/types';

export const functionScoreFunctions: QueryDslFunctionScoreContainer[] = [
  {
    filter: {
      term: {
        visibility: 'active',
      },
    },
    weight: 2,
  },
  {
    filter: {
      term: {
        visibility: 'demo',
      },
    },
    weight: 1,
  },
  {
    filter: {
      term: {
        visibility: 'archived',
      },
    },
    weight: 0,
  },
  {
    filter: {
      bool: {
        must_not: {
          exists: {
            field: 'visibility',
          },
        },
      },
    },
    weight: 1,
  },
];
