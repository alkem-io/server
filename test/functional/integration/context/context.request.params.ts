import { TestUser } from '../../../utils/token.helper';
import { graphqlRequestAuth } from '../../../utils/graphql.request';

export const createRelationMutation = async (
  opportunityId: any,
  relationType: string,
  relationDescription?: string,
  relationActorName?: string,
  relationActorType?: string,
  relationActorRole?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation CreateRelation($relationData: RelationInput!, $opportunityID: Float!) {
      createRelation(relationData: $relationData, opportunityID: $opportunityID) {
        id
        type
        description
        actorName
        actorType
        actorRole
      }
    }`,
    variables: {
      opportunityID: parseFloat(opportunityId),
      relationData: {
        type: `${relationType}`,
        description: `${relationDescription}`,
        actorName: `${relationActorName}`,
        actorType: `${relationActorType}`,
        actorRole: `${relationActorRole}`,
      
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const updateRelationMutation = async (
  relationId: any,
  relationType: string,
  relationDescription?: string,
  relationActorName?: string,
  relationActorType?: string,
  relationActorRole?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation updateRelation($relationData: RelationInput!, $ID: Float!) {
        updateRelation(relationData: $relationData, ID: $ID) {    
          id
          type
          description
          actorName
          actorType
          actorRole
        }
      }`,
    variables: {
      ID: parseFloat(relationId),
      relationData: {
        type: `${relationType}`,
        description: `${relationDescription}`,
        actorName: `${relationActorName}`,
        actorType: `${relationActorType}`,
        actorRole: `${relationActorRole}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const removeRelationMutation = async (relationId: any) => {
  const requestParams = {
    operationName: null,
    query: `mutation removeRelation($ID: Float!) {
      removeRelation(ID: $ID)
    }`,
    variables: {
      ID: parseFloat(relationId),
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

// const removeActorMutation = `
// mutation removeActor($ID: Float!) {
//     removeActor(ID: $ID)
//   }`;

// const removeActorVariables = `
// {
//     "ID": 1
//   }`;

export const getRelationsPerOpportunity = async (opportunityId: any) => {
  const requestParams = {
    operationName: null,
    query: `query {opportunity(ID: ${parseFloat(opportunityId)}) {
      relations{id type actorName actorType actorRole description}}}`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
