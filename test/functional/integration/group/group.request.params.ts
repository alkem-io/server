import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
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

export const createGroupOnOrganisationMutation = async (
  testGroup: string,
  organisationId: any
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createGroupOnOrganisation($groupData: CreateUserGroupInput!) {
      createGroupOnOrganisation(groupData: $groupData) {
        id
        name
      }
    }`,
    variables: {
      groupData: {
        name: testGroup,
        parentID: parseFloat(organisationId),
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
export const createGroupOnOpportunityMutation = async (
  testGroup: string,
  opportunityId: any
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createGroupOnOpportunity($groupName: String!, $opportunityID: Float!) {
      createGroupOnOpportunity(groupName: $groupName, opportunityID: $opportunityID) {
        name,
        id
        members {
          name
        }
      }
    }`,
    variables: {
      opportunityID: parseFloat(opportunityId),
      groupName: testGroup,
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
export const updateGroupMutation = async (
  groupId: string,
  nameGroup: string,
  profileId?: string,
  descriptionText?: string,
  avatarUrl?: string
) => {
  const requestParams = {
    groupID: null,
    query: `mutation UpdateUserGroup($userGroupData: UpdateUserGroupInput!) {
      updateUserGroup(userGroupData: $userGroupData) {
        id
        name
      }
    }`,
    variables: {
      userGroupData: {
        ID: groupId,
        name: nameGroup,
        profileData: {
          ID: `${profileId}`,
          description: descriptionText,
          avatar: avatarUrl,
        },
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getGroups = async () => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: 'query{ecoverse(ID: "testEcoverse") { groups {id name}}}',
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getGroup = async (groupId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query {
      ecoverse(ID: "testEcoverse") {
      group(ID: "${groupId}") {
        id
        name
        focalPoint {
          name
        }
        members {
          name
          id
        }
      }
    }
  }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeUserGroupMutation = async (groupId: any) => {
  const requestParams = {
    operationName: null,
    query: `mutation deleteUserGroup($deleteData: DeleteUserGroupInput!) {
      deleteUserGroup(deleteData: $deleteData) {
        id
      }}`,
    variables: {
      deleteData: {
        ID: parseFloat(groupId),
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getGroupParent = async (groupId: string) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query { ecoverse(ID: "TestEcoverse" ) {group (ID: "${groupId}")
    { id name
      parent { __typename ... on Community {type }},
      parent { __typename ... on Organisation {id name }},
    },
  }}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
