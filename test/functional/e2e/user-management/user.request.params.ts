import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';


const uniqueId = Math.random().toString();

export const createUserMutation = async (userName: string) => {
  const requestParams = {
    operationName: 'CreateUser',
    query:
      'mutation CreateUser($userData: UserInput!) {createUser(userData: $userData) { id name email }}',
    variables: {
      userData: {
        firstName: `firstName'${uniqueId}`,
        lastName: `lastName${uniqueId}`,
        name: userName,
        email: `${userName}@test.com`,
        aadPassword: `90!ds${uniqueId}`,
        profileData: {
          description: "x",
          avatar: "http://xProf.com",
          tagsetsData: {"tags": ["x1", "x2"], "name": "x"},
          referencesData: {
            name: "x",
            description: "x",
            uri: "https://xRef.com"
          }
        }
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const createUserDetailsMutation = async (
  userName: string,
  firstName: string,
  lastName: string,
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
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone,
        city: 'testCity',
        country: 'testCountry',
        gender: 'testGender',
        aadPassword: `90!ds${uniqueId}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
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

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeUserMutation = async (removeUserID: any) => {
  const requestParams = {
    operationName: 'removeUser',
    query: 'mutation removeUser($userID: Float!) {removeUser(userID: $userID)}',
    variables: {
      userID: parseFloat(removeUserID),
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
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

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const assignGroupFocalPointMutation = async (
  userId: any,
  groupId: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation assignGroupFocalPoint($userID: Float!, $groupID: Float!) {
      assignGroupFocalPoint(groupID: $groupID, userID: $userID) {
        name,
        id,
        focalPoint {
          name
        }
      }
    }`,
    variables: {
      userID: parseFloat(userId),
      groupID: parseFloat(groupId),
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
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

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
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

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
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

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getUserMemberships = async () => {
  const requestParams = {
    operationName: null,
    query: `query {
      users {
        name
        memberof {
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

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getUsers = async () => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: 'query{users {name}}',
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateProfileMutation = async (
  userId: any,
  descritpion: string,
  avatar?: string,
  tagsetDataName?: string,
  tags?: any,
  nameRef?: string,
  uriRef?: string,
  descriptionRef?: string,
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateProfile($profileData: ProfileInput!, $ID: Float!) {
      updateProfile(profileData: $profileData, ID: $ID)}`,
    variables: {
      ID: parseFloat(userId),
      profileData: {
        description: descritpion,
        avatar: avatar,
        tagsetsData: {
          name: tagsetDataName,
          tags: tags
        },
        referencesData:{
          name: nameRef,
          uri: uriRef,
          description: descriptionRef,
        }
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getUsersProfile = async (userId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query {
      user(ID: "${userId}") {
        id
        profile {
          id
          description
          avatar
          tagsets {
            id
            tags
            name
          }
          references {
            id
            name
            uri
            description
          }
        }
      }
    }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
