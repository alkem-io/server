import { graphqlRequest } from '@test/utils/graphql.request';
import '@test/utils/array.matcher';
import { appSingleton } from '@test/utils/app.singleton';
import { getQueries } from '@test/non-functional/auth/queries';

import {
  getCreateMutation,
  getCreateVariables,
} from '@test/non-functional/auth/create-mutations';

import {
  getUpdateVariables,
  getUpdateMutation,
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

describe('DDT anonymous user - queries - Not authorized', () => {
  // Arrange
  test.each`
    query                                | idName           | expectedAuth         | expectedForb
    ${'hostMembers'}                     | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'usersName'}                       | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'usersAccountUPN'}                 | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'usersProfile'}                    | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'usersMemberofGroupsName'}         | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'usersMemberofOrganisationsName'}  | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'userName'}                        | ${'userId'}      | ${notAuthorizedCode} | ${forbiddenCode}
    ${'userAccountUPN'}                  | ${'userId'}      | ${notAuthorizedCode} | ${forbiddenCode}
    ${'userProfile'}                     | ${'userId'}      | ${notAuthorizedCode} | ${forbiddenCode}
    ${'userMemberofGroupsName'}          | ${'userId'}      | ${notAuthorizedCode} | ${forbiddenCode}
    ${'userMemberofOrganisationsName'}   | ${'userId'}      | ${notAuthorizedCode} | ${forbiddenCode}
    ${'usersById'}                       | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsName'}                      | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsFocalPointName'}            | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsProfile'}                   | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsMembersName'}               | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsParentCommunity'}           | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsParentOrganisation'}        | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsWithTagName'}               | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsWithTagFocalPointName'}     | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsWithTagProfile'}            | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsWithTagMembersName'}        | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsWithTagParentCommunity'}    | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'groupsWithTagParentOrganisation'} | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengesContributors'}          | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengesGroups'}                | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengeContributors'}           | ${'challengeId'} | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengeGroups'}                 | ${'challengeId'} | ${notAuthorizedCode} | ${forbiddenCode}
    ${'opportunitiesContributors'}       | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'opportunitiesGroups'}             | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'projectsName'}                    | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'projectsTextId'}                  | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'projectsDescription'}             | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'projectsState'}                   | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'projectsTagset'}                  | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'projectsAspects'}                 | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
  `(
    "should expect: '$expected' for query: '$query'",
    async ({ query, idName, expectedAuth }) => {
      // Act
      const requestParamsQueryData = {
        operationName: null,
        query: getQueries(query, (data as Record<string, number>)[idName]),
        variables: null,
      };
      const response = await graphqlRequest(requestParamsQueryData);
      const responseData = JSON.stringify(response.body).replace('\\', '');
      //

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expectedAuth);
    }
  );
});
// FAILING:
// ${challengesLeadOrganisationGroups} | ${notAuthorizedCode}
// ${challengeLeadOrganisationGroups}  | ${notAuthorizedCode}

// Failing scenarios BUG: https://app.zenhub.com/workspaces/cherrytwist-5ecb98b262ebd9f4aec4194c/issues/cherrytwist/server/578
// ${opportunitiesProjectsId}          | ${notAuthorizedCode}
// ${opportunitiesProjectsAspectsId}   | ${notAuthorizedCode}

describe('DDT anonymous user - queries - authorized', () => {
  // Arrange
  test.each`
    query                                   | idName           | expectedAuth         | expectedForb
    ${'name'}                               | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'hostProfile'}                        | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'contextTagline'}                     | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'contextBackground'}                  | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'contextVision'}                      | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'contextWho'}                         | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'contextImpact'}                      | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'contextReferencesName'}              | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengesName'}                     | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengesTextId'}                   | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengesState'}                    | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengesContext'}                  | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengesLeadOrganisation'}         | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengesTagsets'}                  | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengesOpportunities'}            | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengeName'}                      | ${'challengeId'} | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengeTextId'}                    | ${'challengeId'} | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengeState'}                     | ${'challengeId'} | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengeContext'}                   | ${'challengeId'} | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengeLeadOrganisation'}          | ${'challengeId'} | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengeTagsets'}                   | ${'challengeId'} | ${notAuthorizedCode} | ${forbiddenCode}
    ${'challengeOpportunities'}             | ${'challengeId'} | ${notAuthorizedCode} | ${forbiddenCode}
    ${'opportunitiesName'}                  | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'opportunitiesTextId'}                | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'opportunitiesState'}                 | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'opportunitiesContext'}               | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'opportunitiesActorgroupsName'}       | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'opportunitiesActorGroupsActorsName'} | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'opportunitiesAspects'}               | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
    ${'opportunitiesRelationsName'}         | ${''}            | ${notAuthorizedCode} | ${forbiddenCode}
  `(
    "should NOT expect: '$expected' for query: '$query'",
    async ({ query, idName, expectedAuth, expectedForb }) => {
      // Act
      const requestParamsQueryData = {
        operationName: null,
        query: getQueries(query, (data as Record<string, number>)[idName]),
        variables: null,
      };
      const response = await graphqlRequest(requestParamsQueryData);
      const responseData = JSON.stringify(response.body).replace('\\', '');
      //

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).not.toContain(expectedAuth);
      expect(responseData).not.toContain(expectedForb);
    }
  );
});

describe('DDT anonymous user - Create mutations - Not authorized', () => {
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
    "should expect: '$expected' for create mutation: '$mutation' and variables: '$variables'",
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
      const response = await graphqlRequest(requestParamsCreateMutations);
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});

describe('DDT anonymous user - Update mutations - NOT authorized', () => {
  // Arrange
  test.each`
    mutation                                    | variables                                    | idName                        | expected

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
    ${'addTagsOnTagsetMutation'}                | ${'addTagsOnTagsetVariables'}                | ${'tagsetId'}                 | ${notAuthorizedCode}
    ${'replaceTagsOnTagsetMutation'}            | ${'replaceTagsOnTagsetVariables'}            | ${'tagsetId'}                 | ${notAuthorizedCode}
  `(
    "should expect: '$expected' for update mutation: '$mutation' and variables: '$variables'",
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
      const response = await graphqlRequest(requestParamsUpdateMutations);
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});

// disabled until the bug is fixed: ${'updateUserMutation'}                     | ${'updateUserVariables'}                     | ${'userId'}                   | ${notAuthorizedCode}
// https://app.zenhub.com/workspaces/cherrytwist-5ecb98b262ebd9f4aec4194c/issues/cherrytwist/server/809

describe('DDT anonymous user - Remove mutations - NOT authorized', () => {
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
    "should expect: '$expected' for remove mutation: '$mutation' and variables: '$variables'",
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
      const response = await graphqlRequest(requestParamsRemoveMutations);
      const responseData = JSON.stringify(response.body).replace('\\', '');

      // Assert
      expect(response.status).toBe(200);
      expect(responseData).toContain(expected);
    }
  );
});
