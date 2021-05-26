import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { actorData, contextData } from '@test/utils/common-params';

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
          ${actorData}
          }
        }`,
    variables: {
      actorData: {
        actorGroupID: actorGroupId,
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
        ${actorData}
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
    query: `mutation deleteActor($deleteData: DeleteActorInput!) {
      deleteActor(deleteData: $deleteData) {
        id
      }}`,
    variables: {
      deleteData: {
        ID: actorId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getActorData = async (opportunityId: string) => {
  const requestParams = {
    operationName: null,
    query: `query {ecoverse {opportunity(ID: "${opportunityId}") {
      context{
        ${contextData}
        }
      }
    }
  }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
