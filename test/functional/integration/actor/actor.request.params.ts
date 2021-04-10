import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';

export const createActorMutation = async (
  actorGroupId: string,
  actorName: string,
  actorDescritpion?: string,
  actorValue?: string,
  actorImpact?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createActor($actorData: CreateActorInput!) {
      createActor(actorData: $actorData) {
          id,
          name,
          description,
          value,
          impact
          }
      }`,
    variables: {
      actorData: {
        parentID: parseFloat(actorGroupId),
        name: `${actorName}`,
        description: `${actorDescritpion}`,
        value: `${actorValue}`,
        impact: `${actorImpact}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateActorMutation = async (
  actorId: string,
  actorName: string,
  actorDescritpion?: string,
  actorValue?: string,
  actorImpact?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateActor($actorData: UpdateActorInput!) {
      updateActor(actorData: $actorData) {
          id
          name
          description
          value
          impact
        }
      }`,
    variables: {
      actorData: {
        ID: actorId,
        name: `${actorName}`,
        description: `${actorDescritpion}`,
        value: `${actorValue}`,
        impact: `${actorImpact}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeActorMutation = async (actorId: string) => {
  const requestParams = {
    operationName: null,
    query: `mutation removeActor($deleteData: RemoveEntityInput!) {
      removeActor(deleteData: $deleteData) {
        id
      }}`,
    variables: {
      deleteData: {
        ID: parseFloat(actorId),
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getActorData = async (opportunityId: string) => {
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
