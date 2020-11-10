import { graphqlRequest } from '../utils/graphql.request';

export const createGroupMutation = async (testGroup: string) => {
  const requestParams = {
    operationName: 'CreateGroupOnEcoverse',
    query: `mutation CreateGroupOnEcoverse($groupName: String!) {
        createGroupOnEcoverse(groupName: $groupName) {
          name,
          id,
        }
      }`,
    variables: {
      groupName: testGroup,
    },
  };

  return await graphqlRequest(requestParams);
};

export const getGroups = async () => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: 'query{groups {name id}}',
  };

  return await graphqlRequest(requestParams);
};

export const getGroup = async (groupId: any) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query {
      group(ID: ${groupId}) {
        id
        focalPoint {
          name
        }
        members {
          name
          id
        }
      }
    }
    `,
  };

  return await graphqlRequest(requestParams);
};