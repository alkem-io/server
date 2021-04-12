import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

export const createUserMutation = async (userName: string) => {
  const requestParams = {
    operationName: 'CreateUser',
    query:
      'mutation CreateUser($userData: CreateUserInput!) {createUser(userData: $userData) { id name email profile{id} }}',
    variables: {
      userData: {
        firstName: `fN${uniqueId}`,
        lastName: `lN${uniqueId}`,
        name: userName,
        email: `${userName}@test.com`,
        profileData: {
          description: 'x',
          avatar: 'http://xProf.com',
          tagsetsData: { tags: ['x1', 'x2'], name: 'x' },
          referencesData: {
            name: 'x',
            description: 'x',
            uri: 'https://xRef.com',
          },
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const createUserMutationWithParams = async (
  userName: string,
  userEmail: string
) => {
  const requestParams = {
    operationName: 'CreateUser',
    query:
      'mutation CreateUser($userData: CreateUserInput!) {createUser(userData: $userData) { id name email }}',
    variables: {
      userData: {
        firstName: `fN${uniqueId}`,
        lastName: `lN${uniqueId}`,
        name: userName,
        email: `${userEmail}`,
        //aadPassword: `90!ds${uniqueId}`,
        profileData: {
          description: 'x',
          avatar: 'http://xProf.com',
          tagsetsData: { tags: ['x1', 'x2'], name: 'x' },
          referencesData: {
            name: 'x',
            description: 'x',
            uri: 'https://xRef.com',
          },
        },
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
    query: `mutation CreateUser($userData: CreateUserInput!) {
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
        //aadPassword: `90!ds${uniqueId}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateUserMutation = async (
  updateUserId: string,
  nameUser: string,
  phoneUser: string,
  emailUser?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation UpdateUser($userData: UpdateUserInput!) {
      updateUser(userData: $userData) {
          id
          name
          phone
          email
        }
      }`,
    variables: {
      userData: {
        ID: updateUserId,
        name: nameUser,
        phone: phoneUser,
        email: emailUser,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeUserMutation = async (removeUserID: any) => {
  const requestParams = {
    operationName: 'removeUser',
    query: `mutation removeUser($removeData: RemoveEntityInput!) {
        removeUser(removeData: $removeData) {
          id
          name
        }}`,
    variables: {
      removeData: {
        ID: parseFloat(removeUserID),
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const addUserToGroup = async (userId: any, groupId: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation addUserToGroup($membershipData: UpdateMembershipInput!) {
      addUserToGroup(membershipData: $membershipData)
    }`,
    variables: {
      membershipData: {
        childID: parseFloat(userId),
        parentID: parseFloat(groupId),
      },
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
    query: `mutation assignGroupFocalPoint($membershipData: UpdateMembershipInput!) {
      assignGroupFocalPoint(membershipData: $membershipData) {
        name,
        id,
        focalPoint {
          name
        }
      }
    }`,
    variables: {
      membershipData: {
        childID: parseFloat(userId),
        parentID: parseFloat(groupId),
      },
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
    query: `mutation removeUserFromGroup($membershipData: UpdateMembershipInput!) {
      removeUserFromGroup(membershipData: $membershipData) {
        name,
        id,
        members {
          id,
          name
        }
      }
    }`,
    variables: {
      membershipData: {
        childID: parseFloat(userId),
        parentID: parseFloat(groupId),
      },
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
          communities {
            groups {
              name
            }
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
    query: 'query{users {id name email phone}}',
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getUsersFromChallengeCommunity = async (
  communityGroupId: string
) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query {
      ecoverse {
        group(ID: "${communityGroupId}") {
          name
          id
          members {
            name
            id
          }
        }
      }
    }
    `,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateProfileMutation = async (
  profileId: any,
  descritpion: string,
  avatar?: string,
  tagsetDataName?: string,
  tags?: any,
  nameRef?: string,
  uriRef?: string,
  descriptionRef?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateProfile($profileData: ProfileInput!, $ID: Float!) {
      updateProfile(profileData: $profileData, ID: $ID)}`,
    variables: {
      ID: parseFloat(profileId),
      profileData: {
        description: descritpion,
        avatar: avatar,
        tagsetsData: {
          name: tagsetDataName,
          tags: tags,
        },
        referencesData: {
          name: nameRef,
          uri: uriRef,
          description: descriptionRef,
        },
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
        name
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

export const getUpdatedUserData = async (userId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query {
      user(ID: "${userId}") {
        id
        name
        phone
        email
      }
    }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
