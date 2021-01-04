import { TestUser } from '@utils/token.helper';
import { graphqlRequestAuth } from '@utils/graphql.request';

export const createProjectMutation = async (
  opportunityId: any,
  projectName: any,
  textId: any,
  projectDescritpion?: any,
  projectState?: any
) => {
  const requestParams = {
    operationName: null,
    query: `mutation CreateProject($projectData: ProjectInput!, $opportunityID: Float!) {
      createProject(projectData: $projectData, opportunityID: $opportunityID) {
          id,
        name,
        textID,
        description,
        state
      }
    }`,
    variables: {
      opportunityID: parseFloat(opportunityId),
      projectData: {
        name: `${projectName}`,
        textID: `${textId}`,
        description: `${projectDescritpion}`,
        state: `${projectState}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
