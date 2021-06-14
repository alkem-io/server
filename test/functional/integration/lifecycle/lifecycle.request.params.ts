import { TestUser } from '@test/utils/token.helper';
import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { lifecycleData } from '@test/utils/common-params';

export const eventOnChallengeMutation = async (
  challengeId: string,
  eventsName: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation eventOnChallenge($challengeEventData: ChallengeEventInput!) {
      eventOnChallenge(challengeEventData: $challengeEventData) {
        id
        lifecycle {
          ${lifecycleData}
        }
      }
    }`,
    variables: {
      challengeEventData: {
        ID: challengeId,
        eventName: `${eventsName}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const eventOnOpportunityMutation = async (
  opportunityId: string,
  eventsName: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation eventOnOpportunity($opportunityEventData: OpportunityEventInput!) {
      eventOnOpportunity(opportunityEventData: $opportunityEventData) {
        id
        lifecycle {
          ${lifecycleData}
        }
      }
    }`,
    variables: {
      opportunityEventData: {
        ID: opportunityId,
        eventName: `${eventsName}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const eventOnProjectMutation = async (
  projectId: string,
  eventsName: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation eventOnProject($projectEventData: ProjectEventInput!) {
      eventOnProject(projectEventData: $projectEventData) {
        id
        lifecycle {
          ${lifecycleData}
        }
      }
    }`,
    variables: {
      projectEventData: {
        ID: projectId,
        eventName: `${eventsName}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};

export const eventOnApplicationMutation = async (
  applicationId: string,
  eventsName: string
) => {
  const requestParams = {
    operationName: null,
    query: `mutation eventOnApplication($applicationEventData: ApplicationEventInput!) {
      eventOnApplication(applicationEventData: $applicationEventData) {
        id
        lifecycle {
          ${lifecycleData}
        }
      }
    }`,
    variables: {
      applicationEventData: {
        ID: applicationId,
        eventName: `${eventsName}`,
      },
    },
  };

  return await graphqlRequestAuth(requestParams, TestUser.GLOBAL_ADMIN);
};
