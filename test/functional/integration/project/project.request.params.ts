import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { projectData } from '@test/utils/common-params';

export const createProjectMutation = async (
  opportunityId: string,
  projectName: string,
  textId: string,
  projectDescritpion?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation CreateProject($projectData: CreateProjectInput!) {
      createProject(projectData: $projectData) {

        ${projectData}
      }
    }`,
    variables: {
      projectData: {
        opportunityID: parseFloat(opportunityId),
        name: `${projectName}`,
        textID: `${textId}`,
        description: `${projectDescritpion}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeProjectMutation = async (projectId: any) => {
  const requestParams = {
    operationName: null,
    query: `mutation removeProject($ID: Float!) {
      removeProject(ID: $ID)
    }`,
    variables: {
      ID: parseFloat(projectId),
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};



export const getProjectData = async (projectId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{ecoverse {project (ID: "${projectId}") {${projectData}} }}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
