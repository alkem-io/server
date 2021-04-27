import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { lifecycleData } from '../lifecycle/lifecycle.request.params';

const uniqueId = (Date.now() + Math.random()).toString();

export const createChallangeMutation = async (
  challengeName: string,
  uniqueTextId: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation CreateChallenge($challengeData: CreateChallengeInput!) {
              createChallenge(challengeData: $challengeData) {
                name
                id
                textID
                ${lifecycleData}
                community {
                  id
                  groups {
                    id
                    name
                  }
                }
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

                  }
                }
              }
            }`,
    variables: {
      challengeData: {
        parentID: 1,
        name: challengeName,
        textID: uniqueTextId,
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

export const createBasicChallangeMutation = async (
  challengeName: string,
  uniqueTextId: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation CreateChallenge($challengeData: CreateChallengeInput!) {
              createChallenge(challengeData: $challengeData) {
                name
                id
                textID
                ${lifecycleData}
                community {
                  id
                  groups {
                    id
                    name
                  }
                }
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

                  }
                }
              }
            }`,
    variables: {
      challengeData: {
        parentID: 1,
        name: challengeName,
        textID: uniqueTextId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateChallangeMutation = async (
  challengeId: string,
  challengeName: string,

  taglineText?: string,
  background?: string,
  vision?: string,
  impact?: string,
  who?: string,
  tagsArrey?: any
) => {
  const requestParams = {
    operationName: null,
    query: `mutation UpdateChallenge($challengeData: UpdateChallengeInput!) {
      updateChallenge(challengeData: $challengeData)  {
        name
        id
        textID
        ${lifecycleData}
        community {
          id
          groups {
            id
            name
          }
        }
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

            }
        }
        tagset{
          tags
        }
      }
    }`,
    variables: {
      challengeData: {
        ID: challengeId,
        name: challengeName,
        context: {
          tagline: taglineText,
          background: background,
          vision: vision,
          impact: impact,
          who: who,
        },
        tags: tagsArrey,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeChallangeMutation = async (challengeId: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteChallenge($deleteData: DeleteChallengeInput!) {
      deleteChallenge(deleteData: $deleteData) {
        id
      }}`,
    variables: {
      deleteData: {
        ID: parseFloat(challengeId),
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const addChallengeLeadToOrganisationMutation = async (
  organisationId: string,
  challengeId: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation assignChallengeLead($assignInput: AssignChallengeLeadInput!) {
      assignChallengeLead(assignInput: $assignInput){id}
    }`,
    variables: {
      assignInput: {
        organisationID: organisationId,
        challengeID: challengeId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeChallengeLeadFromOrganisationMutation = async (
  organisationId: any,
  challengeId: any
) => {
  const requestParams = {
    operationName: null,
    query: `mutation removeChallengeLead($removeData: RemoveChallengeLeadInput!) {
      removeChallengeLead(removeData: $removeData) {
        id
      }}`,
    variables: {
      removeData: {
        organisationID: organisationId,
        challengeID: challengeId,
      },
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

export const getChallengeData = async (challengeId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{ecoverse {challenge (ID: "${challengeId}") {
      name
      id
      textID
      ${lifecycleData}
      community {
        id
        groups {
          id
          name
        }
      }
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
        }
        }
      }
    }
  }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getChallengesData = async () => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{ecoverse{ challenges{
      name
      id
      textID
      ${lifecycleData}
      community {
        id
        groups {
          id
          name
        }
      }
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
        }
        }
      }
    }
    }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getChallenge = async (challengeId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{ecoverse{ challenge (ID: "${challengeId}") {
      name
      id
      ${lifecycleData}
      context
      {tagline}
        tagset{
      tags
    }}}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getChallengeUsers = async (challengeId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query {
      ecoverse{
      challenge(ID: "${challengeId}") {
        id
    community {
      id
      groups {
        members{
          id
          name
        }
        id
        name
        focalPoint {
          name
        }
      }
      members {
        name
      }
    }
  }
}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getChallengeOpportunity = async (challengeId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query { ecoverse{
      challenge(ID: "${challengeId}") {
        id
        name
        opportunities{id name textID ${lifecycleData}}}}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getChallengeGroups = async (challengeId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query {ecoverse{
      challenge(ID: "${challengeId}") {
        id
        name
        community{ id
        groups{id name}}}}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
