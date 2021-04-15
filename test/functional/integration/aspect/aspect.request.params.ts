import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

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
        id,
        title,
        framing,
        explanation
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
        id,
        title,
        framing,
        explanation
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
        id, title, framing, explanation
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

export const getAspectPerOpportunity = async (opportunityId: string) => {
  const requestParams = {
    operationName: null,
    query: `query {ecoverse{ opportunity(ID: "${opportunityId}") {
        aspects { id title framing explanation }}}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getAspectPerProject = async (opportunityId: string) => {
  const requestParams = {
    operationName: null,
    query: `query {ecoverse{ opportunity(ID: "${opportunityId}") {
      projects{
        aspects{
          id title framing explanation
        }
      }
    }
  }}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
