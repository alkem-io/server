import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { actorGrpupData, contextData } from '@test/utils/common-params';

export const createActorGroupMutation = async (
  ecosystemModelId: string,
  actorGroupName: string,
  actorDescritpion?: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation createActorGroup($actorGroupData: CreateActorGroupInput!) {
      createActorGroup(actorGroupData: $actorGroupData){
          ${actorGrpupData}
        }
      }`,
    variables: {
      actorGroupData: {
        ecosystemModelID: ecosystemModelId,
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
    query: `mutation deleteActorGroup($deleteData: DeleteActorGroupInput!) {
      deleteActorGroup(deleteData: $deleteData) {
        id
      }}`,
    variables: {
      deleteData: {
        ID: actorGroupId,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getActorGroupsPerOpportunity = async (opportunityId: string) => {
  const requestParams = {
    operationName: null,
    query: `query {ecoverse(ID: "TestEcoverse" ) {opportunity(ID: "${opportunityId}") {
          context{
            ${contextData}
            }
          }
        }
      }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const getActorData = async (subChallengeId: any) => {
  const requestParams = {
    operationName: null,
    query: `query {ecoverse(ID: "TestEcoverse" ) {challenge(ID: "${subChallengeId}") {
        context{
          ${contextData}
          }
        }
      }
    }`,
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
