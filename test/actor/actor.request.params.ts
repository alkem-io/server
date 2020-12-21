import { TestUser } from '../utils/token.helper';
import { graphqlRequestAuth } from '../utils/graphql.request';

export const createActorMutation = async (
  actorGroupId: any,
  actorName: any,
  actorDescritpion?: any,
  actorValue?: any,
  actorImpact?: any
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createActor($actorData: ActorInput!, $actorGroupID: Float!) {
        createActor(actorData: $actorData, actorGroupID: $actorGroupID) {
          id,
          name,
          description,
          value,
          impact
          }
      }`,
    variables: {
      actorGroupID: parseFloat(actorGroupId),
      actorData: {
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
  actorId: any,
  actorName: any,
  actorDescritpion?: any,
  actorValue?: any,
  actorImpact?: any
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateActor($actorData: ActorInput!, $ID: Float!) {
        updateActor(actorData: $actorData, ID: $ID) {    
          name
          description
          value
          impact
        }
      }`,
    variables: {
      ID: parseFloat(actorId),
      actorData: {
        name: `${actorName}`,
        description: `${actorDescritpion}`,
        value: `${actorValue}`,
        impact: `${actorImpact}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeActorMutation = async (actorId: any) => {
  const requestParams = {
    operationName: null,
    query: `mutation removeActor($ID: Float!) {
        removeActor(ID: $ID)
      }`,
    variables: {
      ID: parseFloat(actorId),
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
