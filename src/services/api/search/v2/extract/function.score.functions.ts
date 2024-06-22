import { QueryDslFunctionScoreContainer } from '@elastic/elasticsearch/lib/api/types';

export const functionScoreFunctions: QueryDslFunctionScoreContainer[] = [
  {
    filter: {
      term: {
        'license.visibility': 'active',
      },
    },
    weight: 2,
  },
  {
    filter: {
      term: {
        'license.visibility': 'demo',
      },
    },
    weight: 1,
  },
  {
    filter: {
      term: {
        'license.visibility': 'archived',
      },
    },
    weight: 0,
  },
  {
    filter: {
      bool: {
        must_not: {
          exists: {
            field: 'license.visibility',
          },
        },
      },
    },
    weight: 1,
  },
];
