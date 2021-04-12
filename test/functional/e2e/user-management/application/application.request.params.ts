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
    query: `mutation createApplication($applicationData: CreateApplicationInput!) {
      createApplication(applicationData:$applicationData) ${appData}
      }`,
    variables: {
      applicationData: {
        parentID: communityid,
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
    query: `mutation removeUserApplication($removeData: RemoveEntityInput!) {
      removeUserApplication(removeData: $removeData) {
          questions {
            id
            name
          }
          status
          user {
            id
          }}}`,
    variables: {
      removeData: {
        ID: parseFloat(appId),
      },
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
