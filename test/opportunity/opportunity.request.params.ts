import { graphqlRequest } from '../utils/graphql.request';

export const createOpportunityOnChallengeMutation = async (
  challengeId: string,
  oppName: string,
  oppTextId: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createOpportunityOnChallenge($opportunityData: OpportunityInput!, $challengeID: Float!) {
      createOpportunityOnChallenge(opportunityData: $opportunityData, challengeID: $challengeID) {
        name,
        id
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
            name: 'test name',
            uri: 'https://test.com/',
            description: 'test description',
          },
        },
        tagset: 'test tagset',
      },
    },
  };

  return await graphqlRequest(requestParams);
};
