import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { TestUser } from '@test/utils/token.helper';
import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import { getQueries } from '@test/non-functional/auth/queries';

import {
  createRelationMutation,
  createRelationVariables,
  getCreateMutation,
  getCreateVariables,
} from '@test/non-functional/auth/create-mutations';

import {
  getUpdateMutation,
  getUpdateVariables,
} from '@test/non-functional/auth/update-mutations';

import {
  getRemoveMutation,
  getRemoveVariables,
} from '@test/non-functional/auth/remove-mutations';
import { TestDataServiceInitResult } from '@src/services/data-management/test-data.service';

const notAuthorizedCode = '"code":"UNAUTHENTICATED"';
const forbiddenCode = '"code":"FORBIDDEN"';
const userNotRegistered = 'USER_NOT_REGISTERED';
let data: TestDataServiceInitResult;

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
  data = appSingleton.Instance.getData();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

describe.skip('DDT ecoverse member user - queries - authorized', () => {
  // Arrange
  test.each`
    query                                   | idName           | expected             | expectedForb
    ${'name'}                               | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'hostGroups'}                         | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'hostMembers'}                        | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'hostProfile'}                        | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'contextTagline'}                     | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'contextBackground'}                  | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'contextVision'}                      | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'contextWho'}                         | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'contextImpact'}                      | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'contextReferencesName'}              | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'usersName'}                          | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'usersAccountUPN'}                    | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'usersProfile'}                       | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'usersMemberofAgentCredentials'}      | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'userName'}                           | ${'userId'}      | ${notAuthorizedCode} | ${forbiddenCode}
    ${'userAccountUPN'}                     | ${'userId'}      | ${notAuthorizedCode} | ${forbiddenCode}
    ${'userProfile'}                        | ${'userId'}      | ${notAuthorizedCode} | ${forbiddenCode}
    ${'userMemberofAgentCredentials'}       | ${'userId'}      | ${notAuthorizedCode} | ${forbiddenCode}
    ${'usersById'}                          | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsName'}                         | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsProfile'}                      | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsMembersName'}                  | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsParentCommunity'}              | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsParentOrganisation'}           | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsWithTagName'}                  | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsWithTagProfile'}               | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsWithTagMembersName'}           | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsWithTagParentCommunity'}       | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsWithTagParentOrganisation'}    | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengesName'}                     | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengesTextId'}                   | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengesState'}                    | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengesContext'}                  | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengesLeadOrganisation'}         | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengesLeadOrganisationGroups'}   | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengesContributors'}             | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengesTagsets'}                  | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengesGroups'}                   | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengesOpportunities'}            | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengeName'}                      | ${'challengeId'} | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengeTextId'}                    | ${'challengeId'} | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengeState'}                     | ${'challengeId'} | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengeContext'}                   | ${'challengeId'} | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengeLeadOrganisation'}          | ${'challengeId'} | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengeLeadOrganisationGroups'}    | ${'challengeId'} | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengeContributors'}              | ${'challengeId'} | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengeTagsets'}                   | ${'challengeId'} | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengeGroups'}                    | ${'challengeId'} | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengeOpportunities'}             | ${'challengeId'} | ${notAuthorizedCode} | ${forbiddenCode}
    ${'opportunitiesName'}                  | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'opportunitiesTextId'}                | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'opportunitiesState'}                 | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'opportunitiesContext'}               | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'opportunitiesContributors'}          | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'opportunitiesGroups'}                | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'opportunitiesActorgroupsName'}       | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'opportunitiesActorGroupsActorsName'} | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'opportunitiesAspects'}               | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'opportunitiesRelationsName'}         | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'projectsName'}                       | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'projectsTextId'}                     | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'projectsDescription'}                | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'projectsState'}                      | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'projectsTagset'}                     | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'projectsAspects'}                    | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
  `(
    "should not expect: '$expectedAuth' for query: '$query'",
    async ({ query, idName, expectedAuth, expectedForb }) => {
      // Act
      const requestParamsQueryData = {
        operationName: null,
        query: getQueries(query, (data as Record<string, string>)[idName]),
        variables: null,
      };
      const response = await graphqlRequestAuth(
        requestParamsQueryData,
        TestUser.ECOVERSE_MEMBER
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expectedAuth);
      expect(responseData).not.toContain(expectedForb);
      expect(responseData).not.toContain(userNotRegistered);
    }
  );
});

// Failing scenarios BUG: https://app.zenhub.com/workspaces/cherrytwist-5ecb98b262ebd9f4aec4194c/issues/cherrytwist/server/578
// ${opportunitiesProjectsId}          | ${notAuthorizedCode}
// ${opportunitiesProjectsAspectsId}   | ${notAuthorizedCode}

// skipping the test due to requirenments clarifications
describe.skip('DDT ecoverse member user - Create mutations - authorized', () => {
  // Arrange
  test.each`
    mutation                  | variables                  | expected
    ${createRelationMutation} | ${createRelationVariables} | ${notAuthorizedCode}
  `(
    "should expect: '$expected' for create mutation: '$mutation' and variables: '$variables'",
    async ({ mutation, variables, expected }) => {
      // Act
      const requestParamsCreateMutations = {
        operationName: null,
        query: `${mutation}`,
        variables: `${variables}`,
      };
      const response = await graphqlRequestAuth(
        requestParamsCreateMutations,
        TestUser.ECOVERSE_MEMBER
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
      expect(responseData).not.toContain(forbiddenCode);
      expect(responseData).not.toContain(userNotRegistered);
    }
  );
});

describe.skip('DDT ecoverse member user - Create mutations - NOT authorized', () => {
  // Arrange
  test.each`
    mutation                               | variables                               | idName             | expected
    ${'createOpportunityMutation'}         | ${'createOpportunityVariables'}         | ${'challengeId'}   | ${forbiddenCode}
    ${'createChallengeMutation'}           | ${'createChallengeVariables'}           | ${'test'}          | ${forbiddenCode}
    ${'createGroupOnCommunityMutation'}    | ${'createGroupOnCommunityVariables'}    | ${''}              | ${forbiddenCode}
    ${'createProjectMutation'}             | ${'createProjectVariables'}             | ${'opportunityId'} | ${forbiddenCode}
    ${'createActorGroupMutation'}          | ${'createActorGroupVariables'}          | ${'opportunityId'} | ${forbiddenCode}
    ${'createActorMutation'}               | ${'createActorVariables'}               | ${'actorGroupId'}  | ${forbiddenCode}
    ${'createAspectOnOpportunityMutation'} | ${'createAspectOnOpportunityVariables'} | ${'opportunityId'} | ${forbiddenCode}
    ${'createAspectOnProjectMutation'}     | ${'createAspectOnProjectVariables'}     | ${'projectId'}     | ${forbiddenCode}
    ${'createOrganisationMutation'}        | ${'createOrganisationVariables'}        | ${''}              | ${forbiddenCode}
    ${'createReferenceOnProfileMutation'}  | ${'createReferenceOnProfileVariable'}   | ${'userProfileId'} | ${forbiddenCode}
    ${'createReferenceOnContextMutation'}  | ${'createReferenceOnContextVariables'}  | ${'contextId'}     | ${forbiddenCode}
    ${'createTagsetOnProfileMutation'}     | ${'createTagsetOnProfileVariables'}     | ${'userProfileId'} | ${forbiddenCode}
  `(
    "should expect: '$expected' for create mutation: '$mutation' and variables: '$variables'",
    async ({ mutation, variables, idName, expected }) => {
      // Act
      const requestParamsCreateMutations = {
        operationName: null,
        query: getCreateMutation(mutation),
        variables: getCreateVariables(
          variables,
          (data as Record<string, string>)[idName]
        ),
      };
      const response = await graphqlRequestAuth(
        requestParamsCreateMutations,
        TestUser.ECOVERSE_MEMBER
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});

//  Scenario excluded not to load with fake data the AAD   ${createUserMutation}   | ${createUserVariables}  | ${notAuthorizedCode}

// ${'updateUserMutation'}                     | ${'updateUserVariables'}                     | ${'userId'}                   | ${forbiddenCode}
describe.skip('DDT ecoverse member user - Update mutations - NOT authorized', () => {
  // Arrange
  test.each`
    mutation                                    | variables                                    | idName               | expected
    ${'updateProfileMutation'}                  | ${'updateProfileVariables'}                  | ${'userProfileId'}   | ${forbiddenCode}
    ${'updateOrganisationMutation'}             | ${'updateOrganisationVariabls'}              | ${'organisationId'}  | ${forbiddenCode}
    ${'updateChallengeMutation'}                | ${'updateChallengeVariables'}                | ${'challengeId'}     | ${forbiddenCode}
    ${'updateOpportunityMutation'}              | ${'updateOpportunityVariables'}              | ${'opportunityId'}   | ${forbiddenCode}
    ${'updateAspectMutation'}                   | ${'updateAspectVariable'}                    | ${'aspectId'}        | ${forbiddenCode}
    ${'updateActorMutation'}                    | ${'updateActorVariables'}                    | ${'actorId'}         | ${forbiddenCode}
    ${'addUserToCommunityMutation'}             | ${'addUserToCommunityVariables'}             | ${''}                | ${forbiddenCode}
    ${'addUserToGroupMutation'}                 | ${'addUserToGroupVariables'}                 | ${'groupIdEcoverse'} | ${forbiddenCode}
    ${'addChallengeLeadToOrganisationMutation'} | ${'addChallengeLeadToOrganisationVariables'} | ${'challengeId'}     | ${forbiddenCode}
  `(
    "should expect: '$expected' for update mutation: '$mutation' and variables: '$variables'",
    async ({ mutation, variables, idName, expected }) => {
      // Act
      const requestParamsUpdateMutations = {
        operationName: null,
        query: getUpdateMutation(mutation),
        variables: getUpdateVariables(
          variables,
          (data as Record<string, string>)[idName]
        ),
      };
      const response = await graphqlRequestAuth(
        requestParamsUpdateMutations,
        TestUser.ECOVERSE_MEMBER
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});

describe.skip('DDT ecoverse member user - Remove mutations - NOT authorized', () => {
  // Arrange
  test.each`
    mutation                       | variables                       | idName                   | expected
    ${'removeActorMutation'}       | ${'removeActorVariables'}       | ${'actorId'}             | ${forbiddenCode}
    ${'removeActorGroupMutation'}  | ${'removeActorGroupVariables'}  | ${'actorGroupId'}        | ${forbiddenCode}
    ${'removeAspectMutation'}      | ${'removeAspectVariables'}      | ${'aspectId'}            | ${forbiddenCode}
    ${'removeOpportunityMutation'} | ${'removeOpportunityVariables'} | ${'removeOpportunityId'} | ${forbiddenCode}
    ${'removeChallengeMutation'}   | ${'removeChallengeVariables'}   | ${'removeChallangeId'}   | ${forbiddenCode}
    ${'removeUserMutation'}        | ${'removeUserVariables'}        | ${'userId'}              | ${forbiddenCode}
  `(
    "should expect: '$expected' for remove mutation: '$mutation' and variables: '$variables'",
    async ({ mutation, variables, idName, expected }) => {
      // Act
      const requestParamsRemoveMutations = {
        operationName: null,
        query: getRemoveMutation(mutation),
        variables: getRemoveVariables(
          variables,
          (data as Record<string, string>)[idName]
        ),
      };
      const response = await graphqlRequestAuth(
        requestParamsRemoveMutations,
        TestUser.ECOVERSE_MEMBER
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});
