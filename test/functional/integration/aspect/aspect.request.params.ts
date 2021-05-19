import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { aspectData, collaborationData, contextData, projectData } from '@test/utils/common-params';

export const createAspectOnProjectMutation = async (
  projectId: string,
  aspectTitle: string,
  aspectFraming?: string,
  aspectExplenation?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation CreateAspectOnProject($aspectData: CreateAspectInput!) {
      createAspectOnProject(aspectData: $aspectData) {
        ${aspectData}
      }
    }`,
    variables: {
      aspectData: {
        parentID: parseFloat(projectId),
        title: `${aspectTitle}`,
        framing: `${aspectFraming}`,
        explanation: `${aspectExplenation}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const createAspectOnOpportunityMutation = async (
  opportunityId: string,
  aspectTitle: string,
  aspectFraming?: string,
  aspectExplenation?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation CreateAspect($aspectData: CreateAspectInput!) {
      createAspect(aspectData: $aspectData)  {
        ${aspectData}
      }
    }`,
    variables: {
      aspectData: {
        parentID: parseFloat(opportunityId),
        title: `${aspectTitle}`,
        framing: `${aspectFraming}`,
        explanation: `${aspectExplenation}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateAspectMutation = async (
  aspectId: string,
  aspectTitle: string,
  aspectFraming?: string,
  aspectExplenation?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateAspect($aspectData: UpdateAspectInput!) {
      updateAspect(aspectData: $aspectData) {
        ${aspectData}
      }
    }`,
    variables: {
      aspectData: {
        ID: aspectId,
        title: `${aspectTitle}`,
        framing: `${aspectFraming}`,
        explanation: `${aspectExplenation}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeAspectMutation = async (aspectId: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteAspect($deleteData: DeleteAspectInput!) {
      deleteAspect(deleteData: $deleteData) {
        id
      }}`,
    variables: {
      deleteData: {
        ID: parseFloat(aspectId),
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getAspectPerOpportunity = async (childChallengeId: string) => {
  const requestParams = {
    operationName: null,
    query: `query {ecoverse{ challenge(ID: "${childChallengeId}") {
          context {
            ${contextData}
          }
        }
      }
    }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getAspectPerProjectunderChildChallenge = async (childChallenge: string) => {
  const requestParams = {
    operationName: null,
    query: `query {ecoverse{ challenge(ID: "${childChallenge}") {
      ${collaborationData}
      }
    }
  }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
