import { TestUser } from '@utils/token.helper';
import { graphqlRequestAuth } from '@utils/graphql.request';

const uniqueId = (Date.now() + Math.random()).toString();

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

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
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

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeChallangeMutation = async (challengeId: any) => {
  const requestParams = {
    operationName: null,
    query: `mutation {
      removeChallenge(ID: ${parseFloat(challengeId)})
    }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const addUserToChallangeMutation = async (
  challengeId: any,
  userId: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation addUserToChallenge($userID: Float!, $challengeID: Float!) {
      addUserToChallenge(challengeID: $challengeID, userID: $userID) {
        name,
        id,
        members {
          id,
          name
        }
      }
    }`,
    variables: {
      challengeID: parseFloat(challengeId),
      userID: parseFloat(userId),
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getChallenges = async () => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: 'query{challenges {name id}}',
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getChallenge = async (challengeId: any) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{challenges (ID: ${challengeId}) {name id}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
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

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
