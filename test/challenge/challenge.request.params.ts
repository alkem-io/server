import { graphqlRequest } from '../utils/graphql.request';

let uniqueId = (Date.now() + Math.random()).toString();
// let uniqueTextId = Math.random()
//   .toString(36)
//   .slice(-6);

export const createChallangeMutation = async (
  challengeName: string,
  uniqueTextId: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation CreateChallenge($challengeData: ChallengeInput!) {
              createChallenge(challengeData: $challengeData) {
                name
                id
                textID
                state
                groups {
                  id
                  name
                }
              }
            }`,
    variables: {
      challengeData: {
        name: challengeName,
        textID: uniqueTextId,
        state: 'SELECT * FROM users; DROP users--',
        tags: 'testTags',
        context: {
          tagline: 'test tagline' + uniqueId,
          background: 'test background' + uniqueId,
          vision: 'test vision' + uniqueId,
          impact: 'test impact' + uniqueId,
          who: 'test who' + uniqueId,

          references: [
            {
              name: 'test video' + uniqueId,
              uri: 'https://youtu.be/-wGlzcjs',
              description: 'dest description' + uniqueId,
            },
          ],
        },
      },
    },
  };

  return await graphqlRequest(requestParams);
};

export const updateChallangeMutation = async (
  challengeId: any,
  challengeName: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation UpdateChallenge($challengeID: Float! $challengeData: ChallengeInput!) {
      updateChallenge(challengeID: $challengeID, challengeData: $challengeData) {
        name,
        id
      }
    }`,
    variables: {
      challengeID: parseFloat(challengeId),
      challengeData: {
        name: challengeName,
      },
    },
  };

  return await graphqlRequest(requestParams);
};

export const getChallenges = async () => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: 'query{challenges {name id}}',
  };

  return await graphqlRequest(requestParams);
};

export const getChallenge = async (challengeId: any) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{challenges (ID: ${challengeId}) {name id}}`,
  };

  return await graphqlRequest(requestParams);
};

export const getChallengeUsers = async (challengeId: any) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query {
      challenge(ID: ${challengeId}) {
        id
        contributors {
          name
        }
        groups {
          id
          name
          focalPoint {
            name
          }
          members {
            name
          }
        }
      }
    }`,
  };

  return await graphqlRequest(requestParams);
};
