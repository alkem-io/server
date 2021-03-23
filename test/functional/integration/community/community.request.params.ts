import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

const uniqueId = (Date.now() + Math.random()).toString();

export const createGroupOnCommunityMutation = async (
  communityId: any,
  groupNameText: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createGroupOnCommuity($groupName: String!, $communityID: Float!) {
      createGroupOnCommunity(groupName: $groupName, communityID: $communityID) {
        name,
        id
        members {
          name
        }
      }
    }`,
    variables: {
      groupName: groupNameText,
      communityID: parseFloat(communityId),
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

// review it
export const createGroupMutation = async (testGroup: string) => {
  const requestParams = {
    operationName: 'CreateGroupOnEcoverse',
    query: `mutation CreateGroupOnEcoverse($groupName: String!) {
        createGroupOnEcoverse(groupName: $groupName) {
          name,
          id,
        }
      }`,
    variables: {
      groupName: testGroup,
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const addUserToCommunityMutation = async (
  userid: string,
  communityId: number
) => {
  const requestParams = {
    operationName: null,
    query: `mutation addUserToCommunity($userID: Float!, $communityID: Float!) {
      addUserToCommunity(communityID: $communityID, userID: $userID) {
        name,
        id,
        members {
          id,
          name
        }
      }
    }`,
    variables: {
      userID: parseFloat(userid),
      communityID: `${communityId}`,
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
    query: `mutation CreateChallenge($challengeData: ChallengeInput!) {
              createChallenge(challengeData: $challengeData) {
                name
                id
                textID
                state
                community {
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
        name: challengeName,
        textID: uniqueTextId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateChallangeMutation = async (
  challengeId: any,
  challengeName: string,
  challengeState?: string,
  taglineText?: string,
  background?: string,
  vision?: string,
  impact?: string,
  who?: string,
  refName?: string,
  refUri?: string,
  tagsArrey?: any
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateChallenge($challengeData: UpdateChallengeInput!) {
      updateChallenge(challengeData: $challengeData) {
        name
        id
        textID
        state
        community {
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
        ID: parseFloat(challengeId),
        name: challengeName,
        state: challengeState,
        context: {
          tagline: taglineText,
          background: background,
          vision: vision,
          impact: impact,
          who: who,
          references: [
            {
              name: refName,
              uri: refUri,
            },
          ],
        },
        tags: tagsArrey,
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

export const addChallengeLeadToOrganisationMutation = async (
  organisationId: any,
  challengeId: any
) => {
  const requestParams = {
    operationName: null,
    query: `mutation addChallengeLead($challengeID: Float!, $organisationID: Float!) {
      addChallengeLead(organisationID: $organisationID, challengeID: $challengeID)
    }`,
    variables: {
      organisationID: parseFloat(organisationId),
      challengeID: parseFloat(challengeId),
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
    query: `mutation removeChallengeLead($challengeID: Float!, $organisationID: Float!) {
      removeChallengeLead(organisationID: $organisationID, challengeID: $challengeID)
    }`,
    variables: {
      organisationID: parseFloat(organisationId),
      challengeID: parseFloat(challengeId),
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

export const getChallengeData = async (challengeId: any) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{challenge (ID: ${parseFloat(challengeId)}) {
      name
      id
      textID
      state
      community {
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
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getChallengesData = async () => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{challenges{
      name
      id
      textID
      state
      community {
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
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getChallenge = async (challengeId: any) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{challenge (ID: ${challengeId}) {
      name
      id
      state
      context
      {tagline}
        tagset{
      tags
    }}}`,
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
    community {
      groups {
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
}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getChallengeOpportunity = async (challengeId: any) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query {
      challenge(ID: ${challengeId}) {
        id
        name
        opportunities{id name textID state}}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getChallengeGroups = async (challengeId: any) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query {
      challenge(ID: ${challengeId}) {
        id
        name
        community{
        groups{id name}}}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
