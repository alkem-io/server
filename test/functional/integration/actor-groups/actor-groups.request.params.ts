import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const createActorGroupMutation = async (
  opportunityId: string,
  actorGroupName: string,
  actorDescritpion?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createActorGroup($actorGroupData: CreateActorGroupInput!) {
      createActorGroup(actorGroupData: $actorGroupData) {
          id
          name
          description
            actors {
                    id
                    name
                    description
                  }
          }
      }`,
    variables: {
      actorGroupData: {
        parentID: parseFloat(opportunityId),
        name: `${actorGroupName}`,
        description: `${actorDescritpion}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeActorGroupMutation = async (actorGroupId: any) => {
  const requestParams = {
    operationName: null,
    query: `mutation removeActorGroup($removeData: RemoveEntityInput!) {
      removeActorGroup(removeData: $removeData) {
        id
      }}`,
    variables: {
      removeData: {
        ID: parseFloat(actorGroupId),
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getActorGroupsPerOpportunity = async (opportunityId: string) => {
  const requestParams = {
    operationName: null,
    query: `query {ecoverse {opportunity(ID: "${opportunityId}") {
        actorGroups { id name description actors { name }}}}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getActorData = async (opportunityId: any) => {
  const requestParams = {
    operationName: null,
    query: `query {ecoverse {opportunity(ID: "${opportunityId}") {
      actorGroups{
        actors{
          id name description value impact
        }
      }
    }
  }}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
