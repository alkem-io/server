import { TestUser } from '@utils/token.helper';
import { graphqlRequestAuth } from '@utils/graphql.request';

export const createAspectOnProjectMutation = async (
  projectId: any,
  aspectTitle: any,
  aspectFraming?: any,
  aspectExplenation?: any
) => {
  const requestParams = {
    operationName: null,
    query: `mutation CreateAspectOnProject($aspectData: AspectInput!, $projectID: Float!) {
      createAspectOnProject(aspectData: $aspectData, projectID: $projectID) {
        id,
        title,
        framing,
        explanation
      }
    }`,
    variables: {
      projectID: parseFloat(projectId),
      aspectData: {
        title: `${aspectTitle}`,
        framing: `${aspectFraming}`,
        explanation: `${aspectExplenation}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const createAspectOnOpportunityMutation = async (
  opportunityId: any,
  aspectTitle: any,
  aspectFraming?: any,
  aspectExplenation?: any
) => {
  const requestParams = {
    operationName: null,
    query: `mutation CreateAspect($aspectData: AspectInput!, $opportunityID: Float!) {
      createAspect(aspectData: $aspectData, opportunityID: $opportunityID) {
        id,
        title,
        framing,
        explanation
      }
    }`,
    variables: {
      opportunityID: parseFloat(opportunityId),
      aspectData: {
        title: `${aspectTitle}`,
        framing: `${aspectFraming}`,
        explanation: `${aspectExplenation}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateAspectMutation = async (
  aspectId: any,
  aspectTitle: any,
  aspectFraming?: any,
  aspectExplenation?: any
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateAspect($aspectData: AspectInput!, $ID: Float!) {
      updateAspect(aspectData: $aspectData, ID: $ID) {
        id, title, framing, explanation
      }
    }`,
    variables: {
      ID: parseFloat(aspectId),
      aspectData: {
        title: `${aspectTitle}`,
        framing: `${aspectFraming}`,
        explanation: `${aspectExplenation}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeAspectMutation = async (aspectId: any) => {
  const requestParams = {
    operationName: null,
    query: `mutation removeAspect($ID: Float!) {
      removeAspect(ID: $ID)
    }`,
    variables: {
      ID: parseFloat(aspectId),
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getAspectPerOpportunity = async (opportunityId: any) => {
  const requestParams = {
    operationName: null,
    query: `query {opportunity(ID: ${parseFloat(opportunityId)}) {
        aspects { id title framing explanation }}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getAspectPerProject = async (opportunityId: any) => {
  const requestParams = {
    operationName: null,
    query: `query {opportunity(ID: ${parseFloat(opportunityId)}) {
      projects{
        aspects{
          id title framing explanation
        }
      }
    }
  }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
