import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const searchMutation = async (terms: any, filter: any) => {
  const requestParams = {
    operationName: null,
    query: `query create($searchData: SearchInput!) {
      search(searchData: $searchData) {
        terms
        score
        result {
          __typename
          ... on User {
            id
            displayName
          }
          ... on Organisation {
            id
            displayName
          }
        }
      }
    }`,
    variables: {
      searchData: {
        tagsetNames: ['Keywords'],
        terms: terms,
        typesFilter: filter,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
