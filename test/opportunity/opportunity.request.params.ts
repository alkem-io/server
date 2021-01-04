import { TestUser } from '@utils/token.helper';
import { graphqlRequest, graphqlRequestAuth } from '@utils/graphql.request';

export const createOpportunityOnChallengeMutation = async (
  challengeId: string,
  oppName: string,
  oppTextId: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createOpportunityOnChallenge($opportunityData: OpportunityInput!, $challengeID: Float!) {
      createOpportunityOnChallenge(opportunityData: $opportunityData, challengeID: $challengeID) {
        id
        name
        textID
        state
        context {
          id
          tagline
          background
          vision
          impact
          who
          references {
            id
            name
            uri
            description
          }
        }
      }
    }`,
    variables: {
      challengeID: parseFloat(challengeId),
      opportunityData: {
        name: oppName,
        textID: oppTextId,
        state: 'reserved',
        context: {
          background: 'test background',
          vision: 'test vision',
          tagline: 'test tagline',
          who: 'test who',
          impact: 'test impact',
          references: {
            name: 'test ref name',
            uri: 'https://test.com/',
            description: 'test description',
          },
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateOpportunityOnChallengeMutation = async (
  opportunityId: any
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateOpportunity($opportunityData: OpportunityInput!, $ID: Float!) {
      updateOpportunity(opportunityData: $opportunityData, ID: $ID) {
        id
        name
        textID
        state
        context {
          id
          tagline
          background
          vision
          impact
          who
          references {
            id
            name
            uri
            description
          }
        }
      }
    }`,
    variables: {
      ID: parseFloat(opportunityId),
      opportunityData: {
        name: '1',
        textID: '1',
        state: '1',
        context: {
          background: '1',
          vision: '1',
          tagline: '1',
          who: '1',
          impact: '1',
          references: {
            name: 'test ref name',
            uri: '1',
            description: '1',
          },
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeOpportunityMutation = async (opportunityId: any) => {
  const requestParams = {
    operationName: null,
    query: `mutation removeOpportunity($ID: Float!) {
      removeOpportunity(ID: $ID)
    }`,
    variables: {
      ID: parseFloat(opportunityId),
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const queryOpportunity = async (opportunityId: any) => {
  const requestParams = {
    operationName: null,
    query: `query {
      opportunity(ID: ${parseFloat(opportunityId)}) {
        id
        name
        textID
        state
        context {
          id
          tagline
          background
          vision
          impact
          who
          references {
            id
            name
            uri
            description
          }
        }
      }
    }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const queryOpportunities = async () => {
  const requestParams = {
    operationName: null,
    query: `query {
      opportunities {
        id
        name
        textID
        state
        context {
          id
          tagline
          background
          vision
          impact
          who
          references {
            id
            name
            uri
            description
          }
        }
      }
    }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
