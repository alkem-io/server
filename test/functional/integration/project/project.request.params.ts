import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const createProjectMutation = async (
  opportunityId: string,
  projectName: string,
  textId: string,
  projectDescritpion?: string,
  projectState?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation CreateProject($projectData: CreateProjectInput!) {
      createProject(projectData: $projectData) {
          id,
        name,
        textID,
        description,
        state
      }
    }`,
    variables: {
      projectData: {
        parentID: parseFloat(opportunityId),
        name: `${projectName}`,
        textID: `${textId}`,
        description: `${projectDescritpion}`,
        state: `${projectState}`,
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
