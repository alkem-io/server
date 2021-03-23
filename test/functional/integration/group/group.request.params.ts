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
    query: `mutation createGroupOnOrganization($groupName: String!, $orgID: Float!) {
      createGroupOnOrganisation(groupName: $groupName, orgID: $orgID) {
        id
        name
      }
    }`,
    variables: {
      groupName: testGroup,
      orgID: parseFloat(organisationId),
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
  groupId: any,
  nameGroup: string,
  descriptionText?: string,
  avatarUrl?: string
) => {
  const requestParams = {
    groupID: null,
    query: `mutation UpdateUserGroup($ID: Float!, $userGroupData: UserGroupInput!) {
      updateUserGroup(ID: $ID, userGroupData: $userGroupData) {
        id
        name
      }
    }`,
    variables: {
      ID: parseFloat(groupId),
      userGroupData: {
        name: nameGroup,
        profileData: {
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
    query: 'query{groups {id name}}',
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getGroup = async (groupId: any) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query {
      group(ID: ${groupId}) {
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
    `,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeUserGroupMutation = async (groupId: any) => {
  const requestParams = {
    operationName: null,
    query: `mutation {
      removeUserGroup(ID: ${parseFloat(groupId)})
    }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getGroupParent = async (groupId: any) => {
  const requestParams = {
    operationName: null,
    variables: {},
    query: `query { group (ID: ${groupId})
    { id name
      parent { __typename ... on Ecoverse {id name }},
      parent { __typename ... on Organisation {id name }},
      parent { __typename ... on Challenge {id name }},
      parent { __typename ... on Opportunity {id name }}
    },
  }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
