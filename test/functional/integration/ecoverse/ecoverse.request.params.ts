import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { TestUser } from '@test/utils/token.helper';




export const getEcoverseId = async () => {
  const requestParams = {
    operationName: null,
    query: `query{ecoverse{id}}`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
