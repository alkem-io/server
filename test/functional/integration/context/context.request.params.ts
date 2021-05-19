import { TestUser } from '../../../utils/token.helper';
import { graphqlRequestAuth } from '../../../utils/graphql.request';
import { challengeData } from '@test/utils/common-params';

export const getContextQuery = async (
  challengeId?: string
) => {
  const requestParams = {
    operationName: null,
    query: `query{ecoverse{challenge(ID: "${challengeId}") {${challengeData}}}
    }}`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

