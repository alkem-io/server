import { TestUser } from '@testing/utils/token.helper';
import { graphqlRequestAuth } from '@testing/utils/graphql.request';

export const createActorGroupMutation = async (
  opportunityId: any,
  actorGroupName: any,
  actorDescritpion?: any
) => {
  const requestParams = {
    operationName: null,
    query: `mutation CreateActorGroup($actorGroupData: ActorGroupInput! $opportunityID: Float!) {
        createActorGroup( actorGroupData: $actorGroupData opportunityID: $opportunityID ) {
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
      opportunityID: parseFloat(opportunityId),
      actorGroupData: {
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
    query: `mutation removeActorGroup($ID: Float!) {
        removeActorGroup(ID: $ID)
    }`,
    variables: {
      ID: parseFloat(actorGroupId),
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getActorGroupsPerOpportunity = async (opportunityId: any) => {
  const requestParams = {
    operationName: null,
    query: `query {opportunity(ID: ${parseFloat(opportunityId)}) {
        actorGroups { id name description actors { name }}}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
