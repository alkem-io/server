import { TestUser } from '../../../utils/token.helper';
import { graphqlRequestAuth } from '../../../utils/graphql.request';

export const getContextQuery = async (
  challengeId?: any,
  opportunityId?: any
) => {
  const requestParams = {
    operationName: null,
    query: `query{challenge(ID: ${challengeId}) {id name context{id tagline background vision impact who references{id name uri }}}    
    }`,
    variables: null,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
// context{id tagline background vision impact who references{ id name uri description}}
//  opportunity(ID: ${parseFloat(opportunityId)}){id name context{id tagline background vision impact who references{id name uri description}}}
