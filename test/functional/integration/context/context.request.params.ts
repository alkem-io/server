import { TestUser } from '../../../utils/token.helper';
import { graphqlRequestAuth } from '../../../utils/graphql.request';

export const getContextQuery = async (
  challengeId?: string
) => {
  const requestParams = {
    operationName: null,
    query: `query{ecoverse{challenge(ID: "${challengeId}") {id name context{id tagline background vision impact who references{id name uri }}}
    }}`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

