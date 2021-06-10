import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { lifecycleData } from '@test/utils/common-params';

export const appData = `{
      id
      questions {
        name
        value
      }
      lifecycle {
        ${lifecycleData}
      }
      user {
        id
      }
    }`;

export const createApplicationMutation = async (
  communityid: string,
  userid: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createApplication($applicationData: CreateApplicationInput!) {
      createApplication(applicationData:$applicationData) ${appData}
      }`,
    variables: {
      applicationData: {
        parentID: communityid,
        userID: userid,
        questions: [{ name: 'Test Question 1', value: 'Test answer' }],
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.NON_ECOVERSE_MEMBER);
};

export const removeApplicationMutation = async (appId: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteUserApplication($deleteData: DeleteApplicationInput!) {
      deleteUserApplication(deleteData: $deleteData) {
          questions {
            id
            name
          }
          lifecycle {
            ${lifecycleData}
          }
          user {
            id
          }}}`,
    variables: {
      deleteData: {
        ID: appId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getApplication = async (appId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query{ecoverse(ID: "TestEcoverse" ) {
      application(ID: "${appId}")${appData}}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
