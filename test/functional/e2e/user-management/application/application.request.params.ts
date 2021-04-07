import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const appData = `{
      id
      questions {
        name
        value
      }
      status
      user {
        id
      }
    }`;

export const createApplicationMutation = async (
  communityid: number,
  userid: any
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createApplication(
        $communityId: Float!
        $applicationData: ApplicationInput!
      ) {
        createApplication(
          communityID: $communityId
          applicationData: $applicationData
        ) ${appData}
      }`,
    variables: {
      communityId: communityid,
      applicationData: {
        userId: parseFloat(userid),
        questions: [{ name: 'Test Question 1', value: 'Test answer' }],
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.NON_ECOVERSE_MEMBER);
};

export const removeApplicationMutation = async (appId: any) => {
  const requestParams = {
    operationName: null,
    query: `mutation removeUserApplication($applicationID: Float!) {
        removeUserApplication(applicationID: $applicationID) {
          questions {
            id
            name
          }
          status
          user {
            id
          }}}`,
    variables: {
      applicationID: parseFloat(appId),
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getApplication = async (appId: any) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{ecoverse {
      application(ID: ${appId})${appData}}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
