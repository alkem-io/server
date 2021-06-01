import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { userData } from '@test/utils/common-params';

const uniqueId = Math.random()
  .toString(12)
  .slice(-6);

export const createUserMutation = async (userName: string) => {
  const requestParams = {
    operationName: 'CreateUser',
    query: `mutation CreateUser($userData: CreateUserInput!) {createUser(userData: $userData) { ${userData} }}`,
    variables: {
      userData: {
        firstName: `fN${uniqueId}`,
        lastName: `lN${uniqueId}`,
        displayName: userName,
        nameID: userName,
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
    query: `mutation CreateUser($userData: CreateUserInput!) {createUser(userData: $userData) { ${userData}  }}`,
    variables: {
      userData: {
        firstName: `fN${uniqueId}`,
        lastName: `lN${uniqueId}`,
        displayName: userName,
        nameID: userName,
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
          ${userData}
          }
        }`,
    variables: {
      userData: {
        displayName: userName,
        nameID: userName,
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
          ${userData}
        }
      }`,
    variables: {
      userData: {
        ID: updateUserId,
        displayName: nameUser,
        nameID: nameUser,
        phone: phoneUser,
        // email: emailUser,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeUserMutation = async (removeUserID: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteUser($deleteData: DeleteUserInput!) {
      deleteUser(deleteData: $deleteData) {
          id
          nameID
        }}`,
    variables: {
      deleteData: {
        ID: removeUserID,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const addUserToGroup = async (userId: any, groupId: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation assignUserToGroup($membershipData: AssignUserGroupMemberInput!) {
      assignUserToGroup(membershipData: $membershipData){id name}
    }`,
    variables: {
      membershipData: {
        userID: userId,
        groupID: groupId,
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
    query: `mutation assignGroupFocalPoint($membershipData: AssignUserGroupFocalPointInput!) {
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
        groupID: parseFloat(groupId),
        userID: parseFloat(userId),
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
    query: `mutation removeUserFromGroup($membershipData: RemoveUserGroupMemberInput!) {
      removeUserFromGroup(membershipData: $membershipData) {
        name,
        id,
        members {
          id,
          nameID
        }
      }
    }`,
    variables: {
      membershipData: {
        userID: userId,
        groupID: groupId,
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
        nameID
        agent {
          id
          credentials {
            id
            resourceID
            type
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
    query: `query{users {${userData}}}`,
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
            nameID
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
  profileId: string,
  descritpion: string,
  avatar?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateProfile($profileData: UpdateProfileInput!) {
      updateProfile(profileData: $profileData){id}}`,
    variables: {
      profileData: {
        ID: profileId,
        description: descritpion,
        avatar: avatar,
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
        ${userData}
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
        ${userData}
      }
    }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
