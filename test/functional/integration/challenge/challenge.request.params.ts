import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth, mutation } from '@test/utils/graphql.request';
import {
  challengeDataTest,
  communityData,
  contextData,
  lifecycleData,
} from '@test/utils/common-params';
import { createChallengMut } from '@test/utils/mutations/create-mutation';

const uniqueId = (Date.now() + Math.random()).toString();

export const challengeVariablesData = (
  challengeName: string,
  uniqueTextId: string
) => {
  const variables = {
    challengeData: {
      parentID: '1',
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
  };
  const responseData = JSON.stringify(variables);
  return responseData;
};

export const createChallangeMutation = async (
  challengeName: string,
  uniqueTextId: string
) => {
  return await mutation(
    createChallengMut,
    challengeVariablesData(challengeName, uniqueTextId)
  );
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
        ${challengeDataTest}
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
        ID: challengeId,
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

export const getChallengeData = async (challengeId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{ecoverse {challenge (ID: "${challengeId}") {
      ${challengeDataTest}
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
        ${challengeDataTest}
        }
      }
    }`,
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


