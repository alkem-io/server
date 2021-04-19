import { graphqlRequestAuth } from '@test/utils/graphql.request';
import { TestUser } from '@test/utils/token.helper';
import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import { getQueries } from '@test/non-functional/auth/queries';

import {
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
let data: TestDataServiceInitResult;

beforeAll(async () => {
  if (!appSingleton.Instance.app) await appSingleton.Instance.initServer();
  data = appSingleton.Instance.getData();
});

afterAll(async () => {
  if (appSingleton.Instance.app) await appSingleton.Instance.teardownServer();
});

describe('DDT global admin user - queries - authorized', () => {
  // Arrange
  test.each`
    query                                   | idName           | expectedAuth         | expectedForb
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
    ${'usersMemberofGroupsName'}            | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'usersMemberofOrganisationsName'}     | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'userName'}                           | ${'userId'}      | ${notAuthorizedCode} | ${forbiddenCode}
    ${'userAccountUPN'}                     | ${'userId'}      | ${notAuthorizedCode} | ${forbiddenCode}
    ${'userProfile'}                        | ${'userId'}      | ${notAuthorizedCode} | ${forbiddenCode}
    ${'userMemberofGroupsName'}             | ${'userId'}      | ${notAuthorizedCode} | ${forbiddenCode}
    ${'userMemberofOrganisationsName'}      | ${'userId'}      | ${notAuthorizedCode} | ${forbiddenCode}
    ${'usersById'}                          | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsName'}                         | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsFocalPointName'}               | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsProfile'}                      | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsMembersName'}                  | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsParentCommunity'}              | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsParentOrganisation'}           | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsWithTagName'}                  | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsWithTagFocalPointName'}        | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
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
    "should NOT expect: '$expected' for query: '$query'",
    async ({ query, idName, expectedAuth, expectedForb }) => {
      // Act
      const requestParamsQueryData = {
        operationName: null,
        query: getQueries(query, (data as Record<string, number>)[idName]),
        variables: null,
      };
      const response = await graphqlRequestAuth(
        requestParamsQueryData,
        TestUser.GLOBAL_ADMIN
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expectedAuth);
      expect(responseData).not.toContain(expectedForb);
    }
  );
});

// Failing scenarios BUG: https://app.zenhub.com/workspaces/cherrytwist-5ecb98b262ebd9f4aec4194c/issues/cherrytwist/server/578
// ${opportunitiesProjectsId}          | ${notAuthorizedCode}
// ${opportunitiesProjectsAspectsId}   | ${notAuthorizedCode}

describe('DDT global admin user - Create mutations - authorized', () => {
  // Arrange
  test.each`
    mutation                               | variables                               | idName             | expected
    ${'createOpportunityMutation'}         | ${'createOpportunityVariables'}         | ${'challengeId'}   | ${notAuthorizedCode}
    ${'createChallengeMutation'}           | ${'createChallengeVariables'}           | ${'test'}          | ${notAuthorizedCode}
    ${'createGroupOnCommunityMutation'}    | ${'createGroupOnCommunityVariables'}    | ${''}              | ${notAuthorizedCode}
    ${'createProjectMutation'}             | ${'createProjectVariables'}             | ${'opportunityId'} | ${notAuthorizedCode}
    ${'createActorGroupMutation'}          | ${'createActorGroupVariables'}          | ${'opportunityId'} | ${notAuthorizedCode}
    ${'createActorMutation'}               | ${'createActorVariables'}               | ${'actorGroupId'}  | ${notAuthorizedCode}
    ${'createAspectOnOpportunityMutation'} | ${'createAspectOnOpportunityVariables'} | ${'opportunityId'} | ${notAuthorizedCode}
    ${'createRelationMutation'}            | ${'createRelationVariables'}            | ${'opportunityId'} | ${notAuthorizedCode}
    ${'createAspectOnProjectMutation'}     | ${'createAspectOnProjectVariables'}     | ${'projectId'}     | ${notAuthorizedCode}
    ${'createOrganisationMutation'}        | ${'createOrganisationVariables'}        | ${''}              | ${notAuthorizedCode}
    ${'createReferenceOnProfileMutation'}  | ${'createReferenceOnProfileVariable'}   | ${'userProfileId'} | ${notAuthorizedCode}
    ${'createReferenceOnContextMutation'}  | ${'createReferenceOnContextVariables'}  | ${'contextId'}     | ${notAuthorizedCode}
    ${'createTagsetOnProfileMutation'}     | ${'createTagsetOnProfileVariables'}     | ${'userProfileId'} | ${notAuthorizedCode}
  `(
    "should NOT expect: '$expected' for create mutation: '$mutation' and variables: '$variables'",
    async ({ mutation, variables, idName, expected }) => {
      // Act
      const requestParamsCreateMutations = {
        operationName: null,
        query: getCreateMutation(mutation),
        variables: getCreateVariables(
          variables,
          (data as Record<string, number>)[idName]
        ),
      };
      const response = await graphqlRequestAuth(
        requestParamsCreateMutations,
        TestUser.GLOBAL_ADMIN
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
    }
  );
});

describe('DDT global admin user - Update mutations - authorized', () => {
  // Arrange
  test.each`
    mutation                                    | variables                                    | idName                        | expected
    ${'updateUserMutation'}                     | ${'updateUserVariables'}                     | ${'userId'}                   | ${notAuthorizedCode}
    ${'updateProfileMutation'}                  | ${'updateProfileVariables'}                  | ${'userProfileId'}            | ${notAuthorizedCode}
    ${'updateOrganisationMutation'}             | ${'updateOrganisationVariabls'}              | ${'organisationId'}           | ${notAuthorizedCode}
    ${'updateChallengeMutation'}                | ${'updateChallengeVariables'}                | ${'challengeId'}              | ${notAuthorizedCode}
    ${'updateOpportunityMutation'}              | ${'updateOpportunityVariables'}              | ${'opportunityId'}            | ${notAuthorizedCode}
    ${'updateAspectMutation'}                   | ${'updateAspectVariable'}                    | ${'aspectId'}                 | ${notAuthorizedCode}
    ${'updateActorMutation'}                    | ${'updateActorVariables'}                    | ${'actorId'}                  | ${notAuthorizedCode}
    ${'addUserToCommunityMutation'}             | ${'addUserToCommunityVariables'}             | ${''}                         | ${notAuthorizedCode}
    ${'addUserToGroupMutation'}                 | ${'addUserToGroupVariables'}                 | ${'groupIdEcoverse'}          | ${notAuthorizedCode}
    ${'assignGroupFocalPointMutation'}          | ${'assignGroupFocalPointVariables'}          | ${'groupIdEcoverse'}          | ${notAuthorizedCode}
    ${'removeGroupFocalPointMutation'}          | ${'removeGroupFocalPointVariables'}          | ${'createGroupOnChallengeId'} | ${notAuthorizedCode}
    ${'addChallengeLeadToOrganisationMutation'} | ${'addChallengeLeadToOrganisationVariables'} | ${'challengeId'}              | ${notAuthorizedCode}
    ${'removeUserFromGroupMutation'}            | ${'removeUserFromGroupVariables'}            | ${'addUserToOpportunityId'}   | ${notAuthorizedCode}
  `(
    "should NOT expect: '$expected' for update mutation: '$mutation' and variables: '$variables'",
    async ({ mutation, variables, idName, expected }) => {
      // Act
      const requestParamsUpdateMutations = {
        operationName: null,
        query: getUpdateMutation(mutation),
        variables: getUpdateVariables(
          variables,
          (data as Record<string, number>)[idName]
        ),
      };
      const response = await graphqlRequestAuth(
        requestParamsUpdateMutations,
        TestUser.GLOBAL_ADMIN
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
    }
  );
});

describe('DDT global admin user - Remove mutations - authorized', () => {
  // Arrange
  test.each`
    mutation                       | variables                       | idName                   | expected
    ${'removeActorMutation'}       | ${'removeActorVariables'}       | ${'actorId'}             | ${notAuthorizedCode}
    ${'removeActorGroupMutation'}  | ${'removeActorGroupVariables'}  | ${'actorGroupId'}        | ${notAuthorizedCode}
    ${'removeAspectMutation'}      | ${'removeAspectVariables'}      | ${'aspectId'}            | ${notAuthorizedCode}
    ${'removeOpportunityMutation'} | ${'removeOpportunityVariables'} | ${'removeOpportunityId'} | ${notAuthorizedCode}
    ${'removeChallengeMutation'}   | ${'removeChallengeVariables'}   | ${'removeChallangeId'}   | ${notAuthorizedCode}
    ${'removeUserMutation'}        | ${'removeUserVariables'}        | ${'userId'}              | ${notAuthorizedCode}
  `(
    "should NOT expect: '$expected' for remove mutation: '$mutation' and variables: '$variables'",
    async ({ mutation, variables, idName, expected }) => {
      // Act
      const requestParamsRemoveMutations = {
        operationName: null,
        query: getRemoveMutation(mutation),
        variables: getRemoveVariables(
          variables,
          (data as Record<string, number>)[idName]
        ),
      };
      const response = await graphqlRequestAuth(
        requestParamsRemoveMutations,
        TestUser.GLOBAL_ADMIN
      );
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expected);
    }
  );
});
