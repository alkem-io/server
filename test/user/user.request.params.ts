import { graphqlRequest } from '../utils/graphql.request';

export const createUserMutation = async (userName: string) => {
  const requestParams = {
    operationName: 'CreateUser',
    query:
      'mutation CreateUser($userData: UserInput!) {createUser(userData: $userData) { id name }}',
    variables: {
      userData: {
        firstName: 'testFN',
        lastName: 'testLN',
        name: userName,
        email: `${userName}@test.com`,
      },
    },
  };

  return await graphqlRequest(requestParams);
};

export const createUserDetailsMutation = async (
  userName: string,
  phone: string,
  email: string
) => {
  const requestParams = {
    operationName: 'CreateUser',
    query: `mutation CreateUser($userData: UserInput!) {
        createUser(userData: $userData) {
           id
           name
           phone
           email
          }
        }`,
    variables: {
      userData: {
        name: userName,
        firstName: 'testFN',
        lastName: 'testLN',
        email: email,
        phone: phone,
        city: 'testCity',
        country: 'testCountry',
        gender: 'testGender',
      },
    },
  };

  return await graphqlRequest(requestParams);
};

export const updateUserMutation = async (
  updateUserId: any,
  name: string,
  phone: string
) => {
  const requestParams = {
    operationName: 'UpdateUser',
    query: `mutation UpdateUser($userID: Float!, $userData: UserInput!) {
        updateUser(userID: $userID, userData: $userData) {
          id
          name
          phone
          email
        }
      }`,
    variables: {
      userID: parseFloat(updateUserId),
      userData: {
        name: name,
        phone: phone,
      },
    },
  };

  return await graphqlRequest(requestParams);
};

export const removeUserMutation = async (removeUserID: any) => {
  const requestParams = {
    operationName: 'removeUser',
    query: 'mutation removeUser($userID: Float!) {removeUser(userID: $userID)}',
    variables: {
      userID: parseFloat(removeUserID),
    },
  };

  return await graphqlRequest(requestParams);
};

export const addUserToGroup = async (userId: any, groupId: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation addUserToGroup($userID: Float!, $groupID: Float!) {
      addUserToGroup(groupID: $groupID, userID: $userID)
    }`,
    variables: {
      userID: parseFloat(userId),
      groupID: parseFloat(groupId),
    },
  };

  return await graphqlRequest(requestParams);
};

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

export const removeUserFromGroup = async (userId: any, groupId: string) => {
  const requestParams = {
    operationName: 'removeUserFromGroup',
    query: `mutation removeUserFromGroup($userID: Float!, $groupID: Float!) {
      removeUserFromGroup(groupID: $groupID, userID: $userID) {
        name,
        id,
        members {
          id,
          name
        }
      }
    }`,
    variables: {
      userID: parseFloat(userId),
      groupID: parseFloat(groupId),
    },
  };

  return await graphqlRequest(requestParams);
};

export const addUserToOrganisation = async (
  userId: any,
  organisationId: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation addUserToOrganisation($userID: Float!, $groupID: Float!) {
      addUserToOrganisation(groupID: $groupID, userID: $userID)
    }`,
    variables: {
      userID: parseFloat(userId),
      organisationID: parseFloat(organisationId),
    },
  };

  return await graphqlRequest(requestParams);
};

export const getUserMemberships = async () => {
  const requestParams = {
    operationName: null,
    query: `query {
      users {
        name
        memberof {
          email
          groups {
            name
          }
          challenges {
            name
          }
          organisations {
            name
          }
        }
      }
    }`,
  };

  return await graphqlRequest(requestParams);
};

export const getUsers = async () => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: 'query{users {name}}',
  };

  return await graphqlRequest(requestParams);
};
